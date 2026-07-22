FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No env vars needed at build time — DATABASE_URL/AUTH_SECRET are runtime-only,
# supplied via Coolify's env var UI, never baked into the image (SPEC.md §1).
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/lib/db/migrations ./lib/db/migrations
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
# Migrations run on every container start — safe to re-run (drizzle tracks what's
# already applied) and simpler than coordinating a separate deploy step for a
# small pilot deployment.
CMD ["sh", "-c", "node scripts/migrate.mjs && pnpm start"]
