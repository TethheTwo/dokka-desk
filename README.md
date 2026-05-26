# DOKKA Desk

Sistema de gestión de tickets y reportes para asistencias (automotor, bici, mascotas, hogar, dental), con panel de administración, reportes AP/CG y dashboard KPI.

> **Stack:** Bun + TanStack Start + Supabase (GoTrue + PostgREST) + PostgreSQL + Kong + Docker

---

## Quick Start

### Un solo comando (recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/TethheTwo/dokka-desk/main/start.sh | bash
```

> Solo necesitas **Docker**. El script clona, genera credenciales y arranca todo.

### Paso a paso

```bash
git clone https://github.com/TethheTwo/dokka-desk.git
cd dokka-desk
./init.sh
docker compose up -d
```

La app estará en **http://localhost:3000**. Las credenciales de admin se muestran al ejecutar `./init.sh` o con `grep ADMIN_ .env`.

---

## Servicios

| Servicio | Tecnología | Puerto expuesto |
|---|---|---|
| `app` | Bun + TanStack Start | `3000` |
| `db` | PostgreSQL 15 Alpine | `5432` |
| `kong` | Kong 3.4 (API Gateway) | `8000`, `8443`, `8001` |
| `auth` | Supabase GoTrue | — |
| `rest` | PostgREST | — |

### Arquitectura

```
Navegador → app:3000 → proxy /auth/v1 y /rest/v1 → Kong → GoTrue / PostgREST → PostgreSQL
                    → sirve assets estáticos + SSR
                    → /storage/v1/object/ → archivos locales (./uploads/)
```

---

## Comandos útiles

```bash
docker compose logs -f          # Logs de todos los servicios
docker compose logs -f app      # Logs de la app
docker compose down             # Detener (no pierde datos)
docker compose down -v          # Detener y borrar BD
docker compose build app        # Reconstruir la app
docker compose exec db psql     # Acceder a PostgreSQL
docker compose ps               # Estado de servicios
./backup.sh                     # Backup de BD
```

---

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | Requerida |
| `JWT_SECRET` | Secreto JWT | Requerido |
| `SITE_URL` | URL pública del sitio | `http://localhost:3000` |
| `SUPABASE_PUBLISHABLE_KEY` | Anon key | Requerida |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Requerida |
| `ADMIN_EMAIL` | Email del admin inicial | `admin@dokkadesk.com` |
| `ADMIN_PASSWORD` | Contraseña del admin inicial | Requerida |
| `VITE_SUPABASE_URL` | URL de Supabase (frontend) | `http://localhost:3000` |
| `UPLOAD_DIR` | Directorio de uploads | `/app/uploads` |

---

## Seguridad

- `./init.sh` genera secrets únicos (JWT, POSTGRES_PASSWORD, claves admin)
- `.env` en `.gitignore` — nunca se sube al repo
- No expongas los puertos `5432`, `8001` al exterior
- Usa un reverse proxy con SSL para producción

> Para un análisis completo de producción, despliegue, conflictos de puertos y solución de errores, consulta la **[Guía de producción →](/PRODUCTION-GUIDE.md)**

---

## Estructura

```
dokka-desk/
├── docker/kong.yml            # Configuración de Kong
├── supabase/migrations/       # Migraciones SQL
├── src/
│   ├── components/            # Componentes React
│   ├── routes/                # Páginas y layouts
│   ├── lib/                   # Lógica de negocio
│   └── integrations/          # Clientes Supabase
├── docker-compose.yml         # Stack Docker (5 servicios)
├── Dockerfile                 # Build multi-stage
├── entrypoint.sh              # Entrypoint del contenedor app
├── init.sh                    # Generador de .env
├── server-entry.js            # Servidor Bun
├── scripts/generate_excel.py  # Generador de Excel
├── start.sh                   # Instalador one-click
├── backup.sh                  # Backup de PostgreSQL
└── PRODUCTION-GUIDE.md        # Guía de producción
```

---

## Licencia

Uso interno / privado. No redistribuir sin autorización.
