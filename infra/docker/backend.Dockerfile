FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
RUN npm ci
RUN npm run build -w packages/shared
RUN npm run build -w apps/backend
# Buang dev dependencies sebelum disalin ke runner — hasil npm ci membawa
# toolchain build yang tidak dibutuhkan saat runtime.
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache tzdata curl
ENV NODE_ENV=production
# Jangan jalan sebagai root; folder uploads (storage lokal) harus bisa
# ditulisi user ini bila dipakai bersama named volume.
RUN addgroup -S rscb && adduser -S rscb -G rscb \
    && mkdir -p /app/uploads && chown -R rscb:rscb /app
USER rscb
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/apps/backend/src/main"]
