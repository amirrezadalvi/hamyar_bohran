# استفاده از نسخه 20 برای سازگاری با better-sqlite3
FROM node:20-alpine AS builder

# نصب ابزارهای ضروری برای کامپایل ماژول‌های نیتیو
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/database.sqlite ./database.sqlite

EXPOSE 3000
CMD ["node", "server.js"]