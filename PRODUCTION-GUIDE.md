# DOKKA Desk — Guía de Producción

> Análisis completo del stack, infraestructura requerida, configuración en contenedor
> Proxmox (CT 103), conflictos de puertos, requisitos, y todo lo necesario para un
> despliegue en producción real.

---

## Índice

1. [Resumen del stack](#1-resumen-del-stack)
2. [Infraestructura: CT 103 (Proxmox)](#2-infraestructura-ct-103-proxmox)
3. [Dependencias instaladas](#3-dependencias-instaladas)
4. [Análisis de servicios Docker](#4-análisis-de-servicios-docker)
5. [Conflictos de puertos: análisis completo](#5-conflictos-de-puertos-análisis-completo)
6. [Almacenamiento y backups](#6-almacenamiento-y-backups)
7. [Red y conectividad](#7-red-y-conectividad)
8. [Producción real: Checklist](#8-producción-real-checklist)
9. [Solución de problemas](#9-solución-de-problemas)
10. [Referencias](#10-referencias)

---

## 1. Resumen del stack

| Componente | Tecnología | Propósito |
|---|---|---|
| Base de datos | PostgreSQL 15 Alpine | Almacenamiento persistente |
| API Gateway | Kong 3.4 | Enrutamiento /auth/v1 y /rest/v1, CORS |
| Autenticación | Supabase GoTrue v2.132.3 | Login, registro, JWT |
| API REST | PostgREST v11.2.0 | API automática sobre PostgreSQL |
| Web App | Bun + TanStack Start + React 19 | SSR + SPA, panel admin |
| Excel | Python + openpyxl | Generación de reportes |

### Puertos usados internamente

| Puerto | Servicio | Propósito |
|---|---|---|
| 3000 | app-web | Web app (frontend + SSR) |
| 5432 | PostgreSQL | Base de datos |
| 8000 | Kong Proxy | API Gateway (proxy público) |
| 8443 | Kong Proxy SSL | API Gateway (SSL) |
| 8001 | Kong Admin | Admin API de Kong |
| 9999 | GoTrue | Auth interno |

---

## 2. Infraestructura: CT 103 (Proxmox)

### Ficha técnica del contenedor

```
Hostname:       ct103-dokka
ID:             103
IP:             10.10.0.103/24
Gateway:        10.10.0.1
Bridge:         vmbr1
OS:             Debian 12 (Bookworm)
Arquitectura:   amd64
Cores:          2
RAM:            4512 MB
Swap:           2512 MB
Rootfs:         50 GB (local-zfs)
Nesting:        activado
Onboot:         sí
Unprivileged:   sí
DNS:            1.1.1.1
```

### Comando de creación

```
pct create 103 local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --arch amd64 \
  --cores 2 \
  --hostname ct103-dokka \
  --memory 4512 \
  --swap 2512 \
  --net0 name=eth0,bridge=vmbr1,firewall=1,gw=10.10.0.1,\
        hwaddr=BC:24:11:09:85:A6,ip=10.10.0.103/24,type=veth \
  --rootfs local-zfs:50 \
  --ostype debian \
  --features nesting=1 \
  --onboot 1 \
  --startup order=20,up=30 \
  --unprivileged 1 \
  --nameserver 1.1.1.1
```

### Almacenamiento

- **Rootfs**: ZFS dataset (`rpool/data/subvol-103-disk-0`), 50 GB sparse
- **Pool de almacenamiento**: `local-zfs` (tipo zfspool en rpool/data)
- **Templates**: `local` (tipo dir en `/var/lib/vz`)

### ¿Por qué estas specs?

| Especificación | Motivo |
|---|---|
| 2 cores | Suficiente para Bun + PostgreSQL + Kong |
| 4.5 GB RAM | PostgreSQL necesita al menos 1 GB, Bun necesita ~512 MB, Kong ~256 MB |
| 50 GB disco | Suficiente para imágenes Docker, datos de BD, uploads |
| nesting=1 | Necesario para ejecutar Docker dentro del CT |
| unprivileged | Seguridad: el CT no puede escalar a root en el host |
| vmbr1 | Red interna aislada (no expuesta directamente a internet) |

---

## 3. Dependencias instaladas

### Paquetes del sistema

Instalados en el CT 103 para soportar la aplicación:

| Paquete | Versión | Propósito |
|---|---|---|
| `docker-ce` | 29.5.2 | Motor de contenedores |
| `docker-compose-plugin` | v5.1.4 | Orquestación multi-contenedor |
| `git` | 2.39.5 | Control de versiones |
| `curl` / `wget` | — | Transferencias HTTP |
| `ca-certificates` | — | Certificados SSL |
| `gnupg` | — | Verificación de firmas GPG |
| `lsb-release` | — | Información del sistema |
| `python3` / `python3-pip` | 3.11 | Generación de JWTs y Excel |
| `openssl` | — | Generación de secrets |
| `build-essential` | — | Compilación de dependencias nativas |

### Imágenes Docker (descargadas al hacer `docker compose up -d`)

| Imagen | Tamaño aprox | Propósito |
|---|---|---|
| `postgres:15-alpine` | ~250 MB | Base de datos |
| `kong:3.4` | ~180 MB | API Gateway |
| `supabase/gotrue:v2.132.3` | ~50 MB | Autenticación |
| `postgrest/postgrest:v11.2.0` | ~20 MB | API REST |
| `oven/bun:1.2-slim` | ~200 MB | Runtime Bun (imagen base) |

**Total de descarga inicial**: ~700 MB en imágenes Docker.

### Dependencias del frontend (npm/bun)

El archivo `package.json` lista ~68 dependencias de producción y ~14 de desarrollo.
Incluye:

- **TanStack Start** + **React 19** + **React Router**
- **Supabase JS Client** (`@supabase/supabase-js`)
- **shadcn/ui** (Radix UI primitives + Tailwind CSS v4)
- **Recharts** (gráficos KPI)
- **React-PDF** / **jsPDF** / **ExcelJS** (reportes)
- **React Hook Form** + **Zod** (formularios validados)
- **date-fns**, **lucide-react**, **sonner**, **vaul**, etc.

---

## 4. Análisis de servicios Docker

### docker-compose.yml — 5 servicios

| Servicio | Nombre contenedor | Depende de | Puerto host |
|---|---|---|---|
| `db` | `dokka-db` | — | 5432 |
| `kong` | `dokka-kong` | — | 8000, 8443, 8001 |
| `auth` | `dokka-auth` | db (healthy) | — |
| `rest` | `dokka-rest` | db (healthy) | — |
| `app` | `dokka-web` | kong, auth, rest | 3000 |

### Volúmenes Docker

| Volumen | Monta en | Propósito |
|---|---|---|
| `postgres_data` | `/var/lib/postgresql/data` | Datos persistentes de BD |
| `./uploads` | `/app/uploads` | Archivos subidos por usuarios |

### Redes Docker

Todos los servicios comparten la red por defecto de Docker Compose.
La comunicación interna se hace por nombre de servicio (ej. `http://auth:9999`).

### Configuración de Kong

Kong se ejecuta en modo **declarativo** (sin base de datos).
La configuración está en `docker/kong.yml`:

- **Ruta `/auth/v1`** → redirige a `http://auth:9999`
- **Ruta `/rest/v1`** → redirige a `http://rest:3000`
- **Plugin CORS** habilitado para `http://localhost:3000`

### Entrypoint de la app (`entrypoint.sh`)

1. Espera a que GoTrue esté listo (health check cada 2s, hasta 30 intentos)
2. Crea el usuario administrador via API de GoTrue
3. Inicia el servidor Bun con `server-entry.js`

### `server-entry.js` (servidor Bun)

- Sirve assets estáticos (build de TanStack)
- Hace proxy inverso a Kong (`/auth/v1` → Kong 8000, `/rest/v1` → Kong 8000)
- Maneja `/storage/v1` para subida/descarga de archivos

---

## 5. Conflictos de puertos: análisis completo

### Escenario: múltiples CTs en el mismo host Proxmox

Cada contenedor Proxmox tiene su propia **IP independiente** en vmbr1:

| CT | IP | Propósito |
|---|---|---|
| 100 | 10.10.0.100 | Edge |
| 101 | 10.10.0.101 | Forgejo |
| 102 | 10.10.0.102 | Web |
| 103 | 10.10.0.103 | DOKKA Desk |

**Los puertos NO entran en conflicto entre CTs** porque cada CT escucha
en su propia IP. El puerto 3000 en CT 101 es diferente del puerto 3000
en CT 103.

### Escenario: puertos dentro del mismo CT

Dentro del CT 103, Docker expone estos puertos en `0.0.0.0`:

| Puerto host (CT) | Servicio |
|---|---|
| 3000 | app-web |
| 5432 | PostgreSQL |
| 8000 | Kong Proxy |
| 8443 | Kong Proxy SSL |
| 8001 | Kong Admin |

Si otro servicio en el mismo CT intenta usar uno de estos puertos,
habrá conflicto.

### ¿Qué pasa si ya hay un puerto ocupado?

Docker fallará con: `Error: port is already allocated`.

**Solución**: Cambiar el mapeo de puertos en `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # host:container
```

### Estrategias para evitar conflictos

1. **IP separada por CT** (recomendado) — cada CT tiene su propia IP,
   los puertos no compiten entre CTs. Esto ya está implementado.

2. **Cambiar puertos del host** si dentro del mismo CT hay otro servicio
   en el mismo puerto:

   ```yaml
   # docker-compose.yml
   ports:
     - "3000:3000"   # app → si conflicto, cambiar a "3001:3000"
     - "5433:5432"   # postgres → si conflicto, cambiar a "5433:5432"
   ```

3. **Usar Docker host network** (no recomendado para producción porque
   pierdes aislamiento de red).

4. **Proxy inverso (Nginx/Caddy)** — usa un solo puerto (80/443) y
   enruta por dominio:

   ```
   dokka.zokaboom.xyz → CT 103 → Kong/app puerto interno
   ```

### Regla de oro

> **Cada CT es un entorno aislado con su propia pila de red.**
> Mientras no ejecutes dos servicios que ocupen el mismo puerto
> dentro del mismo CT, no habrá conflicto.

---

## 6. Almacenamiento y backups

### Backup de la base de datos

El script `backup.sh` realiza un `pg_dump` de PostgreSQL:

```bash
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="dokkadesk_${TIMESTAMP}.sql"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists --no-owner --no-privileges \
  > "$BACKUP_DIR/$FILENAME"
```

Mantiene los últimos 7 backups y elimina los más antiguos.

### Estrategia de backup recomendada

| Frecuencia | Qué | Cómo |
|---|---|---|
| Cada 6h | PostgreSQL | `backup.sh` vía cron |
| Diario | Uploads | rsync a otro servidor |
| Semanal | Volúmenes Docker | `docker compose down` + copia de `postgres_data` |

### Espacio en disco estimado

| Elemento | Tamaño estimado |
|---|---|
| Imágenes Docker | ~700 MB |
| PostgreSQL (vacío) | ~50 MB |
| PostgreSQL (en uso) | ~1-10 GB (según datos) |
| Uploads | Variable |
| Logs Docker | ~100 MB |
| **Total** | **~2-12 GB** |

---

## 7. Red y conectividad

### Diagrama de red

```
[Internet]
     │
     │ (puerto 80/443)
     ▼
[Host: vmbr0] ───── 192.168.18.2/24 ───── [Router: 192.168.18.1]
     │
     │ (vmbr1: bridge interno)
     │
     ├── CT 101: 10.10.0.101 (Forgejo :3000)
     ├── CT 102: 10.10.0.102 (Web)
     └── CT 103: 10.10.0.103 (DOKKA Desk :3000)
```

### Acceso a la aplicación

Para exponer DOKKA Desk externamente, necesitas un **proxy inverso**
en el host que redirija el tráfico:

```
Host (vmbr0:192.168.18.2)
  → Nginx en host:80/443
    → proxy_pass http://10.10.0.103:3000
      → app-web (Bun)
        → proxy_pass para /auth/v1 y /rest/v1 a Kong:8000
```

### Comunicación entre contenedores Docker

Dentro del CT, los servicios se comunican por el nombre del servicio
(red bridge de Docker Compose). No es necesario configurar rutas
adicionales.

---

## 8. Producción real: Checklist

### Infraestructura

- [ ] CT creado con nesting activado (necesario para Docker-in-Docker)
- [ ] Docker + Docker Compose instalados
- [ ] Git instalado
- [ ] Python 3 + pip + openssl instalados
- [ ] Suficiente espacio en disco (mínimo 10 GB libres)
- [ ] IP fija asignada (10.10.0.103)
- [ ] Onboot activado (se inicia solo al reiniciar el host)

### Seguridad

- [ ] Firewall: puertos 5432, 8001 bloqueados al exterior
- [ ] TLS/SSL configurado (reverse proxy con certs)
- [ ] `.env` generado con secrets únicos
- [ ] `.env` en `.gitignore` (nunca subirlo al repo)
- [ ] Contraseña de admin cambiada después del primer inicio
- [ ] Kong admin API (:8001) no expuesto externamente
- [ ] Contenedor unprivileged (ya configurado)

### Despliegue

- [ ] `./init.sh` ejecutado para generar `.env`
- [ ] `docker compose up -d` ejecutado
- [ ] Verificar que todos los servicios están corriendo: `docker compose ps`
- [ ] Verificar logs: `docker compose logs --tail=50`
- [ ] Probar acceso a `http://10.10.0.103:3000`
- [ ] Probar login de administrador
- [ ] Backup inicial de BD ejecutado

### Monitoreo

- [ ] Logs de Docker rotados (logrotate)
- [ ] Backup automático configurado (cron)
- [ ] Monitoreo de disco (ZFS + df)
- [ ] Alertas de salud del contenedor (uptime)

---

## 9. Solución de problemas

### Error: `port is already allocated`

**Causa**: Otro servicio en el mismo CT ya está usando el puerto.

**Solución**: Cambiar el mapeo en `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # usar un puerto diferente en el host
```

### Error: `Cannot connect to the Docker daemon`

**Causa**: Docker no está corriendo.

**Solución**:
```bash
systemctl start docker
systemctl enable docker
```

### Error: `GoTrue is not ready`

**Causa**: El entrypoint no puede conectar a GoTrue (auth).

**Solución**:
```bash
# Verificar que auth está corriendo
docker compose ps
# Ver logs de auth
docker compose logs auth
# Verificar que la BD está healthy
docker compose logs db
```

### Error: `Kong: no route`

**Causa**: Kong no está configurado correctamente.

**Solución**:
```bash
# Verificar configuración declarativa
docker compose exec kong cat /opt/kong/kong.yml
# Ver logs de Kong
docker compose logs kong
```

### Error: `pg_isready` no responde

**Causa**: PostgreSQL no se ha inicializado completamente.

**Solución**: Esperar unos segundos y reintentar. La primera inicialización
puede tomar hasta 30 segundos.

### El CT no tiene acceso a internet

**Causa**: El host Proxmox tiene `net.ipv4.ip_forward = 0`.

**Solución**:
```bash
# En el host Proxmox (solo si es necesario)
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p
```

> ⚠️ **Nota**: En el entorno actual, los CTs tienen salida a internet
> a través del router 10.10.0.1 sin necesidad de IP forwarding en el host.

---

## 10. Referencias

### Documentación oficial

- [Docker Compose](https://docs.docker.com/compose/)
- [Bun](https://bun.sh/docs)
- [TanStack Start](https://tanstack.com/router/latest/docs/framework/react/start/overview)
- [Kong Gateway](https://docs.konghq.com/gateway/3.4.x/)
- [Supabase GoTrue](https://github.com/supabase/gotrue)
- [PostgREST](https://postgrest.org/en/v11/)
- [Proxmox CT](https://pve.proxmox.com/wiki/Linux_Container)

### Configuración del CT 103

- **IP**: 10.10.0.103/24
- **Hostname**: ct103-dokka
- **Repo remoto local**: `http://10.10.0.101:3000/Tethhe/dokka-desk.git`
- **Repo remoto GitHub**: `https://github.com/TethheTwo/dokka-desk.git`
- **Rama específica**: `ct103-production`

---

> **Última actualización**: Mayo 2026
> **Entorno**: Proxmox VE 9.2.2 / Debian 12 CT / Docker 29.x
