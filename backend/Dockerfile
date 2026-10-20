FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nova
RUN adduser -S nova -u 1001

COPY --from=builder --chown=nova:nova /app/dist ./dist
COPY --from=builder --chown=nova:nova /app/node_modules ./node_modules
COPY --from=builder --chown=nova:nova /app/prisma ./prisma
COPY --from=builder --chown=nova:nova /app/scripts ./scripts
COPY --from=builder --chown=nova:nova /app/package.json ./

EXPOSE 8080

# Persistent storage: SQLite database + uploads live under /app/data.
# blitz.cloud keeps declared VOLUME folders across restarts/rebuilds.
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || exit 1

CMD ["sh", "-c", "mkdir -p /app/data && npx prisma db push --skip-generate && node scripts/cleanup-test-users.js; node scripts/cleanup-learning.cjs; node scripts/ensure-admin.cjs; node scripts/fix-media-urls.cjs; node dist/main.js"]
