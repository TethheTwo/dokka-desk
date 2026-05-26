# DOKKA Desk

Sistema de gestión de tickets y reportes para asistencias (automotor, bici, mascotas, hogar, dental), con panel de administración, reportes AP/CG y dashboard KPI.

> **Stack:** Bun + TanStack Start + Supabase (GoTrue + PostgREST) + PostgreSQL + Docker

---

## Índice

- [Requisitos](#requisitos)
- [Quick Start](#quick-start)
- [Primer inicio](#primer-inicio)
- [Cargar datos de prueba](#cargar-datos-de-prueba)
- [Seguridad](#seguridad)
- [Variables de entorno](#variables-de-entorno)
- [Arquitectura del stack](#arquitectura-del-stack)
- [Comandos útiles](#comandos-útiles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Guía de producción](/PRODUCTION-GUIDE.md)

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/)
- [Python 3](https://www.python.org/) (para generar los JWTs en `init.sh`)
- [OpenSSL](https://www.openssl.org/) (para generar secrets aleatorios)

---

## Quick Start

```bash
# 1. Clonar
git clone https://github.com/TethheTwo/dokka-desk.git
cd dokka-desk

# 2. Generar .env con secrets aleatorios (solo la primera vez)
./init.sh

# 3. Iniciar el stack completo
docker compose up -d
```

En unos segundos la app estará disponible en **http://localhost:3000**.

Las credenciales de administrador se muestran al ejecutar `./init.sh`.
Si las perdiste, revisa el archivo `.env` que se generó:

```bash
grep ADMIN_ .env
```

---

## Primer inicio

Cuando ejecutas `docker compose up -d` por primera vez:

1. Se crea la base de datos PostgreSQL con las migraciones SQL automáticas (tablas, roles, permisos, listas maestras)
2. Kong (API Gateway) se configura con las rutas `/auth/v1` y `/rest/v1`
3. GoTrue (Auth) se inicia en el puerto 9999
4. PostgREST (API REST) se inicia en el puerto 3000 (interno)
5. El entrypoint de la app (`entrypoint.sh`) crea el usuario administrador con las credenciales del `.env`
6. La app web (Bun + TanStack) se inicia en el puerto **3000** y sirve assets estáticos + SSR

---

## Cargar datos de prueba

El repositorio incluye archivos SQL con datos de prueba:

```bash
# Tickets (300 tickets + ~880 notas + audit_log)
docker compose exec -T db psql -U postgres -d postgres < seed_datos.sql

# Reportes (150 AP + 150 CG)
docker compose exec -T db psql -U postgres -d postgres < seed_reportes.sql
```

> Estos archivos están listados en `.gitignore` de forma predeterminada por su tamaño.
> Si no existen localmente, solicítalos al administrador del repositorio.

---

## Seguridad

### Secrets generados automáticamente

`./init.sh` genera un archivo `.env` con:

- **JWT_SECRET**: aleatorio de 64 caracteres (HMAC-SHA256)
- **POSTGRES_PASSWORD**: aleatorio de 32 caracteres
- **SUPABASE_PUBLISHABLE_KEY / SERVICE_ROLE_KEY**: JWTs firmados con el JWT_SECRET
- **ADMIN_EMAIL / ADMIN_PASSWORD**: credenciales de administrador aleatorias

Cada instalación tiene secrets únicos.

### Producción

Si vas a exponer el sistema a internet, consulta la **[Guía de producción](/PRODUCTION-GUIDE.md)** para una configuración completa.

Resumen rápido:

1. **Firewall**: No expongas los puertos 5432 (PostgreSQL), 8001 (Kong Admin) ni 8000 (Kong proxy) al exterior
2. **TLS**: Reverse proxy con SSL (Nginx, Caddy, Traefik) — ver sección de producción
3. **Cambia las credenciales del admin por defecto** desde Administración > Usuarios
4. **Copia `.env` a un lugar seguro** — si lo pierdes, no podrás iniciar sesión
5. **`.env` está en `.gitignore`** — nunca se sube al repositorio

---

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | Requerida |
| `JWT_SECRET` | Secreto para firmar tokens JWT | Requerido |
| `SITE_URL` | URL pública del sitio | `http://localhost:3000` |
| `SUPABASE_PUBLISHABLE_KEY` | Clave anónima (anon key) | Requerida |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de service role | Requerida |
| `ADMIN_EMAIL` | Email del admin inicial | `admin@dokkadesk.com` |
| `ADMIN_PASSWORD` | Contraseña del admin inicial | Requerida |
| `VITE_SUPABASE_URL` | URL de Supabase para el frontend | `http://localhost:3000` |
| `UPLOAD_DIR` | Directorio de uploads | `/app/uploads` |
| `PORT` | Puerto del servidor web | `3000` |

---

## Arquitectura del stack

```
                    ┌─────────────────────────────────────────────┐
                    │              app-web (:3000)                 │
                    │  ┌───────────────────────────────────────┐   │
                    │  │  server-entry.js (Bun)                 │   │
                    │  │  ├── Sirve assets estáticos           │   │
                    │  │  ├── Proxy /auth/v1 → Kong            │   │
                    │  │  ├── Proxy /rest/v1 → Kong            │   │
                    │  │  └── Storage handler (/storage/v1)    │   │
                    │  └───────────────────────────────────────┘   │
                    └──────────┬─────────────────┬─────────────────┘
                               │                 │
                    ┌──────────▼────┐    ┌───────▼──────────┐
                    │  Kong (:8000) │    │  Sistema de      │
                    │  API Gateway  │    │  archivos        │
                    │  ┌──────────┐ │    │  (./uploads/)    │
                    │  │ /auth/v1 ├─┼───►│                  │
                    │  │ /rest/v1 ├─┼───►│                  │
                    │  └──────────┘ │    └──────────────────┘
                    └───┬──────┬───┘
                   ┌────▼──┐┌─▼──────┐
                   │ Auth  ││ REST   │
                   │GoTrue ││PostgREST│
                   │:9999  ││:3000   │
                   └───┬───┘└───┬────┘
                       │        │
                    ┌──▼────────▼────┐
                    │  PostgreSQL    │
                    │  (app-db)      │
                    │  :5432         │
                    └────────────────┘
```

---

## Comandos útiles

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f app

# Detener todo (no pierde datos)
docker compose down

# Detener todo y borrar volúmenes (pierde la BD)
docker compose down -v

# Reconstruir la app después de cambios
docker compose build app && docker compose up -d app

# Acceder a la base de datos
docker compose exec db psql -U postgres -d postgres

# Respaldar la base de datos
./backup.sh

# Ver estado de los servicios
docker compose ps
```

---

## Estructura del proyecto

```
dokka-desk/
├── docker/
│   └── kong.yml              # Configuración de Kong (CORS, rutas)
├── supabase/
│   └── migrations/           # Migraciones SQL (ordenadas por timestamp)
├── src/
│   ├── components/           # Componentes React reutilizables
│   ├── routes/               # Páginas y layouts (TanStack Router)
│   ├── lib/                  # Lógica de negocio y stores
│   └── integrations/         # Clientes Supabase
├── docker-compose.yml        # Stack completo (5 servicios)
├── Dockerfile                # Build de la app (multi-stage)
├── entrypoint.sh             # Punto de entrada del contenedor app
├── init.sh                   # Genera .env con secrets aleatorios
├── server-entry.js           # Servidor Bun (proxy + storage + SSR)
├── scripts/
│   └── generate_excel.py     # Generador de reportes Excel (openpyxl)
├── backup.sh                 # Script de backup de PostgreSQL
├── .env.example              # Template de variables de entorno
├── bunfig.toml               # Configuración de Bun
├── bun.lock                  # Lockfile de dependencias
├── package.json              # Dependencias del frontend/server
├── tsconfig.json             # Configuración de TypeScript
├── vite.config.ts            # Configuración de Vite
├── components.json           # Configuración de shadcn/ui
└── .gitignore
```

---

## Licencia

Uso interno / privado. No redistribuir sin autorización.

---

> Para un análisis completo de producción, despliegue en CT, conflictos de puertos,
> solución de errores comunes (incluyendo "Failed to fetch"), y configuración avanzada,
> consulta la **[Guía de producción →](/PRODUCTION-GUIDE.md)**
