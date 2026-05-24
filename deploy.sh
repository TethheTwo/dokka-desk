#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -z "$1" ]; then
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║              DOKKA Desk — Deploy Script                      ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Uso: ./deploy.sh <dominio>"
  echo ""
  echo "Ejemplos:"
  echo "  ./deploy.sh dokka-desk.zokaboom.xyz"
  echo "  ./deploy.sh localhost:8080"
  echo "  ./deploy.sh midominio.com"
  echo ""
  exit 1
fi

DOMAIN="$1"
SITE_URL="https://${DOMAIN}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Desplegando DOKKA Desk para: $SITE_URL"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Generate .env if not exists
if [ ! -f .env ]; then
  echo "⚙️  Generando .env con secrets aleatorios..."
  bash init.sh
fi

echo "🔧 Configurando dominio: $SITE_URL"

# Update or add SITE_URL
if grep -q '^SITE_URL=' .env; then
  sed -i "s|^SITE_URL=.*|SITE_URL=$SITE_URL|" .env
else
  echo "SITE_URL=$SITE_URL" >> .env
fi

# Update or add VITE_SUPABASE_URL
if grep -q '^VITE_SUPABASE_URL=' .env; then
  sed -i "s|^VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SITE_URL|" .env
else
  echo "VITE_SUPABASE_URL=$SITE_URL" >> .env
fi

echo "✅ Dominio configurado en .env"
echo ""

echo "🐳 Construyendo e iniciando servicios..."
docker compose up --build -d

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🚀 DOKKA Desk disponible en:                               ║"
echo "║                                                              ║"
echo "║     Local:    http://localhost:8080                           ║"
echo "║     Público:  $SITE_URL"
echo "║                                                              ║"
echo "║  Para conectar Cloudflare Tunnel (si aplica):                ║"
echo "║     Agrega TUNNEL_TOKEN a .env y reinicia:                   ║"
echo "║     docker compose up -d tunnel                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
