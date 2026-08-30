# syntax=docker/dockerfile:1
# Multi-stage build for the NestJS API (@nexora/api).

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /repo

# ---- Dependencies + build -------------------------------------------------
FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nexora/shared-types run build \
 && pnpm --filter @nexora/api run build
# Prune to production dependencies only.
RUN pnpm --filter @nexora/api deploy --prod /app

# ---- Runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Run as the built-in non-root "node" user.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/main.js"]
