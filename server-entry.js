import handler from './dist/server/server.js';
import { serve, file, write } from 'bun';
import { mkdir, unlink } from 'fs/promises';

const KONG = process.env.KONG_URL ?? 'http://kong:8000';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';
const PORT = parseInt(process.env.PORT ?? '3000', 10);

await mkdir(UPLOAD_DIR, { recursive: true });

function safeResolve(root, userPath) {
  // Prevent path traversal — reject any component that is '..'
  if (userPath.includes('..')) {
    throw new Error('Path traversal detected');
  }
  const resolved = `${root}/${userPath}`;
  // Ensure result is still within root
  if (!resolved.startsWith(root + '/')) {
    throw new Error('Path escape detected');
  }
  return resolved;
}

serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    // Proxy API calls to Kong (same-origin, no CORS needed)
    if (url.pathname.startsWith('/auth/v1') || url.pathname.startsWith('/rest/v1')) {
      const upstream = KONG + url.pathname + url.search;
      const headers = new Headers(request.headers);
      headers.delete('host');
      const resp = await fetch(upstream, {
        method,
        headers,
        body: request.body,
      });
      return new Response(resp.body, {
        status: resp.status,
        headers: resp.headers,
      });
    }

    // Serve static assets and favicon
    if (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.png') {
      const path = `./dist/client${url.pathname}`;
      const f = file(path);
      if (await f.exists()) {
        return new Response(f);
      }
    }

    // Storage endpoints
    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      return handleSignedUrl(request, method, url);
    }
    if (url.pathname.startsWith('/storage/v1/object/')) {
      return handleStorage(request, method, url);
    }

    return handler(request);
  },
});

async function handleStorage(request, method, url) {
  const isPublic = url.pathname.includes('/public/');
  const basePath = isPublic
    ? '/storage/v1/object/public/'
    : '/storage/v1/object/';

  const afterBase = url.pathname.slice(basePath.length);
  const slashIdx = afterBase.indexOf('/');
  const bucket = slashIdx >= 0 ? afterBase.slice(0, slashIdx) : afterBase;
  const storagePath = slashIdx >= 0 ? afterBase.slice(slashIdx + 1) : '';

  const bucketDir = `${UPLOAD_DIR}/${bucket}`;
  await mkdir(bucketDir, { recursive: true });

  // Upload
  if (method === 'POST' && storagePath) {
    try {
      const ct = request.headers.get('content-type') || '';
      let uploadFile = null;

      if (ct.includes('multipart/form-data')) {
        const boundary = ct.match(/boundary=([^\s;]+)/)?.[1];
        if (!boundary) throw new Error('No boundary in Content-Type');
        const rawBuf = await request.arrayBuffer();
        const raw = new Uint8Array(rawBuf);
        const rawStr = new TextDecoder('latin1').decode(raw);

        const partMarker = '--' + boundary;
        const partsStr = rawStr.split(partMarker);

        for (let pi = 0; pi < partsStr.length; pi++) {
          const part = partsStr[pi];
          if (!part.includes('filename=')) continue;

          const sep = '\r\n\r\n';
          const sepIdx = part.indexOf(sep);
          if (sepIdx === -1) continue;

          const partStartInRaw = rawStr.indexOf(part);
          const bodyStart = partStartInRaw + sepIdx + sep.length;

          let bodyEnd = raw.length;
          const nextPart = '--' + boundary;
          const restAfterPart = rawStr.substring(partStartInRaw + part.length + partMarker.length);
          const nextMarkerIdx = restAfterPart.indexOf(nextPart);
          if (nextMarkerIdx >= 0) {
            bodyEnd = raw.length - (restAfterPart.length - nextMarkerIdx);
          } else {
            const trailer = restAfterPart.indexOf('--');
            if (trailer >= 0) {
              bodyEnd = raw.length - (restAfterPart.length - trailer);
            }
          }
          while (bodyEnd > bodyStart && (raw[bodyEnd - 1] === 10 || raw[bodyEnd - 1] === 13)) bodyEnd--;

          uploadFile = raw.slice(bodyStart, bodyEnd);
          break;
        }
      } else {
        const buf = await request.arrayBuffer();
        if (buf.byteLength > 0) {
          uploadFile = buf;
        }
      }

      if (!uploadFile) {
        return new Response(JSON.stringify({ error: 'No file provided', note: 'multipart file not found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const destPath = safeResolve(bucketDir, storagePath);
      const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
      await mkdir(destDir, { recursive: true });
      await write(destPath, uploadFile);

      return new Response(JSON.stringify({ Key: `${bucket}/${storagePath}`, Id: crypto.randomUUID() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Serve
  if (method === 'GET' && storagePath) {
    try {
      const diskPath = safeResolve(bucketDir, storagePath);
      const f = file(diskPath);
      if (await f.exists()) {
        return new Response(f);
      }
    } catch {}
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Delete
  if (method === 'DELETE') {
    try {
      const body = await request.json();
      const prefixes = body?.prefixes ?? [];
      for (const p of prefixes) {
        try {
          const diskPath = safeResolve(bucketDir, p);
          await unlink(diskPath);
        } catch {}
      }
      return new Response(JSON.stringify({ message: 'OK' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleSignedUrl(request, method, url) {
  const basePath = '/storage/v1/object/sign/';
  const afterBase = url.pathname.slice(basePath.length);
  const slashIdx = afterBase.indexOf('/');
  const bucket = slashIdx >= 0 ? afterBase.slice(0, slashIdx) : afterBase;
  const storagePath = slashIdx >= 0 ? afterBase.slice(slashIdx + 1) : '';

  if (method === 'POST' && storagePath) {
    return new Response(JSON.stringify({
      signedURL: `/object/${bucket}/${storagePath}`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (method === 'GET' && storagePath) {
    try {
      const bucketDir = `${UPLOAD_DIR}/${bucket}`;
      const diskPath = safeResolve(bucketDir, storagePath);
      const f = file(diskPath);
      if (await f.exists()) return new Response(f);
    } catch {}
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

console.log(`Server running at http://localhost:${PORT}`);
