FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
RUN npm ci
RUN npm run build -w packages/shared
RUN npm run build -w apps/backend

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache tzdata curl
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3000
CMD ["node", "dist/apps/backend/src/main"]
