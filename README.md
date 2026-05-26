# DOKKA Desk

Plataforma corporativa de gestión de tickets, asistencias y reportes. Panel administrativo con KPIs, reportes AP (F-775) y CG (F-805), auditoría, y control de accesos por roles.

> **Stack:** Bun + TanStack Start + PostgreSQL + Kong + GoTrue + PostgREST + Docker

---

## Índice

- [Quick Start](#quick-start)
- [Arquitectura](#arquitectura)
- [Módulos del sistema](#módulos-del-sistema)
- [Roles y permisos](#roles-y-permisos)
- [Estados de ticket](#estados-de-ticket)
- [Tipos de ticket](#tipos-de-ticket)
- [API y storage](#api-y-storage)
- [Variables de entorno](#variables-de-entorno)
- [Comandos](#comandos)
- [Estructura](#estructura)
- [Solución de errores comunes](#solución-de-errores-comunes)

---

## Quick Start

```bash
git clone https://github.com/TethheTwo/dokka-desk.git
cd dokka-desk
./init.sh                     # genera .env con secrets aleatorios
docker compose up -d           # levanta los 5 servicios
```

La app arranca en **http://localhost:3000**. Las credenciales de admin se muestran al ejecutar `./init.sh`.

---

## Arquitectura

```
                        ┌──────────────────────┐
                        │    app-web (:3000)    │
                        │  Bun + TanStack SSR   │
                        │  ─ assets estáticos   │
                        │  ─ proxy /auth /rest  │
                        │  ─ storage handler    │
                        └──────┬───────────┬────┘
                               │           │
                        ┌──────▼────┐ ┌────▼─────────┐
                        │  Kong     │ │  ./uploads/   │
                        │  API GW   │ │  (archivos)   │
                        │  :8000    │ └───────────────┘
                        └───┬───┬───┘
                       ┌────▼──┐┌─▼──────┐
                       │ Auth  ││ REST   │
                       │GoTrue ││PostgREST│
                       │:9999  ││:3000   │
                       └───┬───┘└───┬────┘
                           │        │
                        ┌──▼────────▼────┐
                        │  PostgreSQL    │
                        │  :5432         │
                        └────────────────┘
```

Cada petición del frontend a `/auth/v1/*` o `/rest/v1/*` es proxeada por Bun hacia Kong, que enruta a GoTrue (Auth) o PostgREST (API REST). Los archivos subidos se sirven desde `/storage/v1/object/` directamente por Bun.

---

## Módulos del sistema

### Dashboard
KPIs de tickets en los últimos 7 días: total, dentro TMA, fuera TMA, cumplimiento %, tiempo promedio. Gráficos de tickets por tipo, cerrados por usuario (top 10), y tendencia diaria.

### Tickets
Sistema de tickets con 7 tipos y 6 estados. Cada ticket tiene historial de notas con adjuntos (imágenes, documentos). Flujo: Pendiente → En atención → [Esperando Respuesta | Cliente no responde | Actualizado] → Cerrado.

- `GET /tickets/listado` — Lista con búsqueda, filtros, paginación
- `GET /tickets/registrar` — Nuevo ticket tipo "Derivado a Conecta"
- **Reporte individual**: Descarga PDF por ticket con datos, notas, y adjuntos embebidos

### Asistencias
5 tipos de asistencia, cada uno con su propio formulario y campos específicos:

| Tipo | Rutas | Campos clave |
|---|---|---|
| Automotor | `/asistencias/automotor` | placa, marca, modelo, 2 direcciones |
| Mascotas | `/asistencias/mascotas` | tipo_asistencia desde lista maestra |
| Bici | `/asistencias/bici` | tipo_asistencia desde lista maestra |
| Hogar | `/asistencias/hogar` | detalle del problema, dirección |
| Dental | `/asistencias/dental` | tipo_asistencia libre |

### Reportes AP / CG
Dos tipos de reportes con formularios (F-775 y F-805), listado CRUD, previsualización, exportación (PDF/Excel) y uso compartido.

| Tipo | Prefijo | Ruta lista | Ruta detalle | Ruta pública |
|---|---|---|---|---|
| Accidentes Personales | `AP-` | `/reportes/accidentes-personales` | `/reporte/ap/$id` | `/p/reporte/ap/$id` |
| Casos Generales | `CG-` | `/reportes/casos-generales` | `/reporte/cg/$id` | `/p/reporte/cg/$id` |

Los reportes pueden compartirse por:
- **WhatsApp**: captura como imagen PNG
- **Email**: con formato HTML + CC a `nacionalseguros@conecta.com.bo`
- **Link público**: URL sin autenticación

### Administración
- **Usuarios**: CRUD completo, cambio de rol (admin/supervisor/operador/addiuva), reseteo de password, activar/inactivar
- **Roles**: matriz de permisos por rol (12 permisos, configurable desde UI)
- **Listas maestras**: editores para ejecutivos, correos, tipos de asistencia

### Auditoría
Bitácora de todas las acciones sobre tickets y reportes con filtros y exportación.

---

## Roles y permisos

| Permiso | administrador | supervisor | operador | addiuva |
|---|---|---|---|---|
| Ver tickets | ✅ | ✅ | ✅ | ✅ |
| Ver asistencias | ✅ | ✅ | ✅ | ❌ |
| Ver reportes | ✅ | ✅ | ✅ | ❌ |
| Ver dashboard | ✅ | ✅ | ❌ | ❌ |
| Ver auditoría | ✅ | ✅ | ❌ | ❌ |
| Ver administración | ✅ | ❌ | ❌ | ❌ |
| Ver listas maestras | ✅ | ❌ | ❌ | ❌ |
| Eliminar tickets | ✅ | ❌ | ❌ | ❌ |

El rol `administrador` tiene **todos** los permisos siempre (forzado por base de datos y frontend). Los permisos `download_records`, `delete_reports`, `share_reports`, `reopen_closed_cases` pueden activarse desde la UI de Roles.

---

## Estados de ticket

```
Pendiente ──→ En atención ──→ Esperando Respuesta
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            Cliente no         Actualizado    Cerrado
            responde
```

---

## Tipos de ticket

- Derivación Addiuva a Conecta
- Derivado a Conecta
- Asistencia Automotor
- Asistencia Mascotas
- Asistencia Bici
- Asistencia Hogar
- Asistencia Dental

---

## API y storage

### Endpoints del servidor Bun

| Ruta | Método | Función |
|---|---|---|
| `/auth/v1/*` | ANY | Proxy a Kong → GoTrue |
| `/rest/v1/*` | ANY | Proxy a Kong → PostgREST |
| `/storage/v1/object/*` | GET/POST/DELETE | Subida/descarga/borrado de archivos |
| `/storage/v1/object/sign/*` | GET/POST | Signed URLs (60s) |
| `/api/export/excel` | POST | Generación de Excel vía Python/openpyxl |
| `/assets/*` | GET | Assets estáticos compilados |
| `/favicon.png` | GET | Favicon |

### Buckets de storage

| Bucket | Tipo | Acceso |
|---|---|---|
| `ticket-attachments` | Privado | Lectura/escritura autenticado |
| `avatars` | Público | Lectura pública, escritura autenticado |

---

## Variables de entorno

| Variable | Obligatoria | Default | Descripción |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | — | Contraseña de PostgreSQL |
| `JWT_SECRET` | ✅ | — | Secreto para firmar JWTs |
| `SITE_URL` | ❌ | `http://localhost:3000` | URL pública del sitio |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | — | Anon key (JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Service role key (JWT) |
| `ADMIN_EMAIL` | ❌ | `admin@dokkadesk.com` | Email del admin inicial |
| `ADMIN_PASSWORD` | ❌ | — | Password del admin inicial |
| `UPLOAD_DIR` | ❌ | `/app/uploads` | Directorio de archivos subidos |

> `./init.sh` genera todas las claves automáticamente con `openssl` y `python3`.

---

## Comandos

```bash
# Gestión de servicios
docker compose up -d            # Iniciar todo
docker compose down             # Detener (conserva datos)
docker compose down -v          # Detener y borrar BD
docker compose ps               # Estado
docker compose logs -f          # Logs en vivo
docker compose logs -f app      # Logs solo de la app

# Build y actualización
docker compose build app        # Reconstruir imagen de la app
docker compose up -d app        # Reiniciar app con nueva imagen

# Base de datos
docker compose exec db psql -U postgres -d postgres   # Consola SQL
./backup.sh                     # Backup de la BD

# Utilidades
grep ADMIN_ .env                # Ver credenciales de admin
```

---

## Estructura

```
dokka-desk/
├── docker/
│   └── kong.yml                  # Configuración de Kong (CORS, rutas)
├── supabase/
│   └── migrations/               # 11 migraciones SQL (tablas, roles, RLS, triggers)
├── src/
│   ├── components/               # 13 componentes principales + 57 UI base (shadcn)
│   ├── routes/                   # 21 rutas (TanStack Router)
│   ├── lib/                      # 13 módulos (auth, permisos, tickets, reportes, etc.)
│   ├── integrations/supabase/    # Cliente Supabase (cliente y servidor)
│   └── assets/                   # Logos (login, navbar)
├── scripts/
│   └── generate_excel.py         # Generación de Excel con openpyxl
├── docker-compose.yml            # 5 servicios
├── Dockerfile                    # Multi-stage build (bun install → vite build → release)
├── server-entry.js               # Servidor HTTP (Bun) con proxy y storage
├── entrypoint.sh                 # Entrypoint: espera GoTrue, crea admin, inicia server
├── init.sh                       # Genera .env con secrets
├── start.sh                      # Instalador one-click
└── backup.sh                     # pg_dump con rotación de 7 días
```

---

## Solución de errores comunes

### "Failed to fetch" en login o dashboard
El frontend usa `window.location.origin` para las llamadas a la API. Si accedés por un dominio (Cloudflare, nginx, etc.), debería funcionar automáticamente. Verificá que `SITE_URL` en `.env` coincida con la URL de acceso.

### Las imágenes no aparecen en el PDF descargado
El PDF usa `window.location.origin` para fetch de imágenes. Si descargás desde un dominio, las imágenes se sirven desde el mismo dominio a través del storage handler de Bun.

### Port already allocated
Cambiar el mapeo en `docker-compose.yml`: `"3001:3000"` para usar un puerto distinto.

### GoTrue no arranca
Esperar a que PostgreSQL esté healthy. Puede tomar hasta 30 segundos en el primer inicio.

---

> Para un análisis completo de producción, conflictos de puertos, despliegue en Proxmox, y configuración de Cloudflare Tunnel, consulta la **[Guía de producción →](/PRODUCTION-GUIDE.md)**
