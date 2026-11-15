# syntax=docker/dockerfile:1

# Build context: repository root, because the web app imports shared types from
# apps/api/src/types.ts (type-only; no server code enters the bundle).
FROM node:20-alpine AS build
WORKDIR /repo
COPY apps/api/src/types.ts ./apps/api/src/types.ts
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
WORKDIR /repo/apps/web
RUN npm ci --no-audit --no-fund
COPY apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html ./
COPY apps/web/public ./public
COPY apps/web/src ./src
# The SPA calls relative /api paths; nginx proxies them to the API container,
# so no build-time API URL is baked into the bundle.
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
