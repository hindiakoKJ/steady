# ─────────────────────────────────────────────────────────────────────────────
#  Steady API — Railway Docker build
#  Build context: repo root (docker build -f Dockerfile .)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# ── Workspace manifests first (layer caching) ────────────────────────────────
COPY package.json package-lock.json ./
COPY packages/db/package.json        ./packages/db/
COPY packages/types/package.json     ./packages/types/
COPY packages/ui/package.json        ./packages/ui/
COPY apps/api/package.json           ./apps/api/

# --ignore-scripts: skip postinstall `prisma generate` — schema not copied yet
RUN npm install --workspaces --include-workspace-root --ignore-scripts --legacy-peer-deps

# ── Copy all source ───────────────────────────────────────────────────────────
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# ── Generate Prisma client ────────────────────────────────────────────────────
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# ── Compile NestJS API ────────────────────────────────────────────────────────
RUN npm run build -w @repo/api

EXPOSE 3001

# Run pending migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && node apps/api/dist/main"]
