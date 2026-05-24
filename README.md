# DOKKA Desk

Sistema de tickets y reportes para asistencias (automotor, bici, mascotas, hogar, dental), con panel de administración, reportes AP/CG y dashboard KPI.

> **Stack:** Bun + TanStack Start + Supabase (GoTrue + PostgREST) + PostgreSQL + Docker  
> **Puerto por defecto:** `8080` (personalizable en `docker-compose.yml`)

---

## 🚀 Despliegue rápido (1 comando)

En cualquier servidor con Docker, clonas y ejecutas:

```bash
git clone https://github.com/TethheTwo/dokka-desk.git
cd dokka-desk
./deploy.sh midominio.com
```

Esto genera secrets, configura el dominio, construye todo y levanta los servicios.

Para probar local:
```bash
./deploy.sh localhost:8080
```

---

## 📦 Despliegue manual paso a paso

```bash
# 1. Clonar
git clone https://github.com/TethheTwo/dokka-desk.git
cd dokka-desk

# 2. Generar .env con secrets aleatorios (solo la primera vez)
./init.sh

# 3. Configurar dominio (editar .env)
#    SITE_URL=https://midominio.com
#    VITE_SUPABASE_URL=https://midominio.com

# 4. Construir e iniciar
docker compose up --build -d
```

App disponible en **http://localhost:8080**.

---

## 🌐 Exponer a internet con Cloudflare Tunnel

### 1. Crear tunnel en Cloudflare

1. Entra a [https://one.dash.cloudflare.com](https://one.dash.cloudflare.com)
2. **Networks → Tunnels → Create a tunnel**
3. Nombre: `dokka-desk`, elige **cloudflared**
4. **Save tunnel**
5. En **Public Hostname** agrega:
   | Campo | Valor |
   |---|---|
   | Subdomain | `dokka-desk` |
   | Domain | `midominio.com` |
   | Type | `HTTP` |
   | URL | `localhost:8080` |

### 2. Agregar token al .env

Copia el token desde el dashboard y agrégalo al `.env`:

```bash
echo "TUNNEL_TOKEN=eyJhIjoi..." >> .env
```

### 3. Iniciar el tunnel

```bash
docker compose up -d tunnel
```

El tunnel se conecta automáticamente con `network_mode: host` y resuelve `localhost:8080`.

---

## 🔄 Desplegar en otro servidor

Cada servidor necesita su propio `.env` con secrets y dominio únicos. El `.gitignore` ya excluye `.env`.

```bash
# En el nuevo servidor:
git clone https://github.com/TethheTwo/dokka-desk.git
cd dokka-desk
./deploy.sh nuevo-dominio.com
```

Para cambiar de dominio después del primer despliegue:

```bash
# Editar .env manualmente:
#   SITE_URL=https://nuevo-dominio.com
#   VITE_SUPABASE_URL=https://nuevo-dominio.com

# Reconstruir (VITE_* se hornea en el build):
docker compose up --build -d app
```

---

## 📋 Primer inicio

Cuando ejecutas `docker compose up --build -d` por primera vez:

1. Se crea la base de datos PostgreSQL
2. Se ejecutan las migraciones SQL (tablas, roles, permisos, listas maestras)
3. Se inician Kong (API Gateway), GoTrue (Auth), PostgREST (API REST)
4. El entrypoint crea el usuario administrador con las credenciales del `.env`
5. La app web se inicia y responde en el puerto configurado

Las credenciales de administrador se muestran al ejecutar `./init.sh`:
```bash
grep ADMIN_ .env
```

---

## 🧪 Datos de prueba

```bash
# Tickets (300 tickets + ~880 notas + audit_log)
docker compose exec -T db psql -U postgres -d postgres < seed_datos.sql

# Reportes (150 AP + 150 CG)
docker compose exec -T db psql -U postgres -d postgres < seed_reportes.sql
```

---

## 🛡️ Seguridad

- `.env` está en `.gitignore` — nunca se sube
- `./init.sh` genera secrets aleatorios únicos por instalación
- JWT firmados con HMAC-SHA256
- Los puertos de PostgreSQL, Kong Admin y Kong proxy **no se exponen al host**
- Solo el puerto de la app web (8080) queda accesible

---

## ⚙️ Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | Requerida |
| `JWT_SECRET` | Secreto para firmar tokens JWT | Requerido |
| `SITE_URL` | URL pública del sitio | `http://localhost:8080` |
| `VITE_SUPABASE_URL` | URL para el frontend (same-origin) | `http://localhost:8080` |
| `SUPABASE_PUBLISHABLE_KEY` | Clave anónima (anon key) | Requerida |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de service role | Requerida |
| `ADMIN_EMAIL` | Email del admin inicial | `admin@dokkadesk.com` |
| `ADMIN_PASSWORD` | Contraseña del admin inicial | Requerida |
| `TUNNEL_TOKEN` | Token de Cloudflare Tunnel | Opcional |
| `KONG_URL` | URL interna de Kong | `http://kong:8000` |
| `UPLOAD_DIR` | Directorio de uploads | `/app/uploads` |
| `PORT` | Puerto interno del servidor | `3000` |

---

## 🏗️ Arquitectura del stack

```
                    ┌──────────────────────────────────────────┐
                    │   pd-web (:8080 local → :3000 container) │
                    │  ┌────────────────────────────────────┐   │
                    │  │  server-entry.js (Bun)              │   │
                    │  │  ├── Sirve assets estáticos        │   │
                    │  │  ├── Proxy /auth/v1 → Kong         │   │
                    │  │  ├── Proxy /rest/v1 → Kong         │   │
                    │  │  └── Storage handler               │   │
                    │  └────────────────────────────────────┘   │
                    └──────────┬──────────────────┬──────────────┘
                               │                  │
                    ┌──────────▼────┐    ┌────────▼──────────┐
                    │  pd-kong     │    │  ./uploads/        │
                    │  API Gateway │    │  Archivos          │
                    │  (:8000)     │    │                    │
                    └───┬──────┬───┘    └───────────────────┘
                   ┌────▼──┐┌─▼──────┐
                   │ Auth  ││ REST   │
                   │GoTrue ││PostgREST│
                   │:9999  ││:3000   │
                   └───┬───┘└───┬────┘
                       │        │
                    ┌──▼────────▼────┐
                    │  PostgreSQL    │
                    │  (pd-db)       │
                    │  :5432         │
                    └────────────────┘

                    ┌────────────────┐
                    │  pd-tunnel     │
                    │  Cloudflare    │
                    │  network_mode: │
                    │  host          │
                    └────────────────┘
```

---

## 🔧 Comandos útiles

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Reconstruir todo después de cambiar el dominio
./deploy.sh nuevo-dominio.com

# Solo reconstruir la app (cuando cambias VITE_*)
docker compose up --build -d app

# Detener todo
docker compose down

# Detener todo y borrar BD
docker compose down -v

# Acceder a la base de datos
docker compose exec db psql -U postgres -d postgres

# Respaldar
./backup.sh
```

---

## 📁 Estructura del proyecto

```
dokka-desk/
├── deploy.sh                # Script de despliegue: ./deploy.sh <dominio>
├── init.sh                  # Genera .env con secrets aleatorios
├── docker-compose.yml       # Stack completo (6 servicios)
├── Dockerfile               # Build multi-stage de la app
├── entrypoint.sh            # Entrypoint del contenedor app
├── server-entry.js          # Servidor Bun (proxy + storage + SSR)
├── .env.example
├── .gitignore
├── docker/
│   └── kong.yml             # Configuración de Kong
├── supabase/
│   └── migrations/          # Migraciones SQL
└── src/
    ├── components/
    ├── routes/
    ├── lib/
    └── integrations/
```

---

## 📝 Notas

- Los `VITE_*` se hornean en el JS en **build-time**. Si cambias el dominio, necesitas rebuild (`docker compose up --build -d app` o `./deploy.sh <dominio>`)
- El tunnel usa `network_mode: host` para acceder a `localhost:8080` directamente
- Los nombres de containers usan prefijo `pd-` para evitar conflictos con otras instalaciones en la misma máquina
