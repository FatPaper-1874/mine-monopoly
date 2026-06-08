# ==================== Build Stage ====================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

WORKDIR /app

# Copy only package.json files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/env/package.json ./packages/env/
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

# Build @mine-monopoly/env (only workspace package that needs compilation)
COPY packages/env/ ./packages/env/
RUN pnpm --filter @mine-monopoly/env build

# Copy remaining source code
COPY packages/types/ ./packages/types/
COPY apps/server/ ./apps/server/

# Create standalone deployment with all dependencies properly resolved
# (including transitive deps of workspace packages like dotenv from @mine-monopoly/env)
RUN pnpm --filter @mine-monopoly/server deploy --legacy /app/deploy

# Bundle server with esbuild into a single file
# --packages=external: keep npm dependencies external (loaded from node_modules)
# This preserves CJS/ESM interop for packages like typeorm and dotenv
RUN npm install -g esbuild && \
    npx esbuild /app/deploy/app.ts \
  --bundle --platform=node --format=esm \
  --packages=external \
  --outfile=/app/deploy/server.js

# Build admin frontend (separate install to avoid pulling in client-only deps into server deploy)
# Admin build-time env vars — pass via --build-arg or docker-compose build args
ARG MAP_ENCRYPT_KEY
ARG PROTOCOL
ARG MONOPOLY_DOMAIN
ARG SERVER_PORT
ARG API_BASE_PREFIX
ARG ADMIN_BASE_PREFIX
ENV MAP_ENCRYPT_KEY=${MAP_ENCRYPT_KEY} \
    PROTOCOL=${PROTOCOL} \
    MONOPOLY_DOMAIN=${MONOPOLY_DOMAIN} \
    SERVER_PORT=${SERVER_PORT} \
    API_BASE_PREFIX=${API_BASE_PREFIX} \
    ADMIN_BASE_PREFIX=${ADMIN_BASE_PREFIX}

COPY packages/utils/package.json ./packages/utils/
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile

COPY packages/utils/ ./packages/utils/
COPY apps/admin/ ./apps/admin/
RUN pnpm --filter @mine-monopoly/admin build

# ==================== Runtime Stage ====================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy deployed node_modules (self-contained, all deps properly resolved)
COPY --from=builder /app/deploy/node_modules ./node_modules

# Copy bundled output
COPY --from=builder /app/deploy/server.js ./server.js

# Copy public files (static assets: avatars, game maps, logs)
COPY --from=builder /app/apps/server/public ./public

# Copy admin frontend build output
COPY --from=builder /app/apps/admin/dist ./admin-dist

EXPOSE 8081 8082 8083

CMD ["node", "server.js"]
