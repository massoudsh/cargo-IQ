# Running CargoIQ with Docker

Two images, one compose file:

| Image | Base | Serves | Port |
|---|---|---|---|
| `cargoiq-api` | `node:20-alpine` | Express API (`dist/index.js`) | 4000, internal only |
| `cargoiq-web` | `nginx:1.27-alpine` | Built React SPA + reverse proxy for `/api` | 8080 |

The browser calls relative `/api/...` paths. nginx proxies them to the `api`
service, so no API URL is baked into the bundle and no CORS configuration is
needed for the bundled setup.

## Quick start

```bash
cp .env.example .env          # optional: set CARGOIQ_API_KEYS before sharing
docker compose build
docker compose up -d
docker compose ps             # wait for both services to report healthy
```

Open <http://localhost:8080>. Change the host port with
`CARGOIQ_HTTP_PORT=9000 docker compose up -d`.

Stop and remove containers (image history is kept):

```bash
docker compose down
```

## What the images do

`apps/api/Dockerfile`

1. Installs from `apps/api/package-lock.json` with `npm ci`.
2. Compiles TypeScript (`npm run build`) and prunes dev dependencies.
3. Copies only `dist`, `package.json` and production `node_modules`.
4. Runs as the unprivileged `node` user, with a `/health` healthcheck.

`apps/web/Dockerfile`

1. Copies **only** `apps/api/src/types.ts` plus the web app (the SPA imports
   shared types from the API package at compile time; it is a type-only import).
2. Builds the Vite bundle in the same repo layout.
3. Copies `dist` into nginx, applies `apps/web/nginx.conf`, runs as the stock
   nginx user.

Build context for both is the repository root, because of that cross-package
type import:

```bash
docker build -f apps/api/Dockerfile -t cargoiq-api:local .
docker build -f apps/web/Dockerfile -t cargoiq-web:local .
```

## Configuration

Environment variables are read by compose from the shell or a root `.env`
file (git-ignored). Variables in `.env.example`:

| Variable | Default | Purpose |
|---|---|---|
| `CARGOIQ_HTTP_PORT` | `8080` | Host port for the web container |
| `CARGOIQ_API_KEYS` | empty | Comma-separated API keys. Empty = one shared development tenant, no authentication |
| `CORS_ORIGIN` | empty | Only needed if you call the API from a different origin |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | empty | Enables OpenTelemetry trace export |
| `OTEL_SERVICE_NAME` | `cargoiq-api` | Service name reported in traces |

Set `CARGOIQ_API_KEYS` before exposing the stack to anyone. Without it every
visitor shares the `development` tenant and all stored decisions.

## Operational limits you must respect

- **State is in memory.** Decisions, RFQ drafts, tracking records and imported
  routes live in the API process. `docker compose down`, a crash, or a new
  image replaces all of it. There is no volume to mount because there is no
  persistence adapter yet - `apps/api/db/schema.sql` is a schema, not a
  connection.
- **Run exactly one API replica.** Two containers behind the proxy would each
  hold a different in-memory history and return 404 for records the other
  created. Do not use `docker compose up --scale api=2` or replicate it in
  Swarm/Kubernetes until a durable store exists.
- **Do not demote `/api` in nginx.** The container path relies on the proxy
  preserving the `/api` prefix.
- **TLS is not terminated here.** Put the stack behind a TLS-terminating
  ingress, load balancer or tunnel, and keep port 8080 off the public internet
  if you enable API keys, since keys travel in the `x-api-key` header.
- **Prices and tracking are illustrative.** The images do not change that: no
  carrier or forwarder integration is included.

## Verifying a deployment

```bash
curl -fsS http://localhost:8080/health                    # ok
curl -fsS http://localhost:8080/api/shipments/recommend \
  -H 'Content-Type: application/json' \
  -d '{"origin":"China","destination":"Iran","cargoType":"electronics","priority":"balanced"}'
```

The second call must return `201` with a `decisionId`. With a key configured,
add `-H "x-api-key: <key>"`; without it the API returns `401`.

Logs are JSON on stdout, so `docker compose logs -f api` is the intended
inspection path.

## Rebuilding after code changes

```bash
docker compose build --pull
docker compose up -d
```

`npm ci` uses the committed lockfiles, so builds are reproducible. Dependency
changes require updating the matching `package-lock.json` first, otherwise the
image will keep installing the locked versions.
