#!/bin/bash
set -e

# Wait for GoTrue to be ready
echo "Waiting for GoTrue..."
for i in $(seq 1 30); do
  if curl -sf http://auth:9999/health > /dev/null 2>&1; then
    echo "GoTrue is ready"
    break
  fi
  echo "Attempt $i/30..."
  sleep 2
done

# Seed admin user if not exists
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@dokkadesk.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

echo "Seeding admin user ($ADMIN_EMAIL)..."
curl -sf -X POST http://kong:8000/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
  -d "$(cat <<JSON
{"email":"${ADMIN_EMAIL}","password":"${ADMIN_PASSWORD}"}
JSON
)" > /dev/null && \
  echo "Admin user created" || echo "Admin seed skipped (may already exist)"

# Update font cache for XeLaTeX / Liberation Sans
fc-cache -f 2>/dev/null || true

exec bun run server-entry.js
