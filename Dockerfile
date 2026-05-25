FROM oven/bun:1.2-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the application
FROM install AS build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Final image
FROM base AS release
RUN apt-get update && apt-get install -y curl python3 python3-pip && rm -rf /var/lib/apt/lists/* && \
    pip3 install openpyxl --break-system-packages --no-cache-dir
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server-entry.js ./server-entry.js
COPY --from=build /app/scripts ./scripts
COPY entrypoint.sh /entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
