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

# ==================== Runtime Stage ====================
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

# tsx: run TypeScript directly, avoids ESM .js extension issues with Node16 moduleResolution
RUN npm install -g tsx

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace configuration (pnpm needs this for symlink resolution)
COPY package.json pnpm-workspace.yaml ./

# Copy @mine-monopoly/env (compiled dist + package.json)
COPY packages/env/package.json ./packages/env/
COPY --from=builder /app/packages/env/dist/ ./packages/env/dist/

# Copy @mine-monopoly/types (raw source, consumed directly)
COPY packages/types/package.json ./packages/types/
COPY packages/types/ ./packages/types/

# Copy server source + public files
COPY apps/server/package.json ./apps/server/
COPY apps/server/ ./apps/server/

# Copy node_modules from builder (preserves pnpm symlinks)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

# API port + PeerJS/ICE port
EXPOSE 8803 82

WORKDIR /app/apps/server

CMD ["tsx", "app.ts"]
