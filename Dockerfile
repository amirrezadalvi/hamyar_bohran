FROM docker.io/library/node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm min ci || npm ci

COPY . .
RUN npm run build

FROM docker.io/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# خط public حذف شد چون در ساختار فایل‌هایت نیست
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/database.sqlite ./database.sqlite

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]