# Build stage
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

RUN pnpm --filter @openclawworld/shared build && \
    pnpm --filter @openclawworld/server build

# Production stage
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

RUN apk add --no-cache wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/server/assets ./assets

RUN chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=2567

EXPOSE 2567

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:2567/health || exit 1

CMD ["node", "packages/server/dist/index.js"]
