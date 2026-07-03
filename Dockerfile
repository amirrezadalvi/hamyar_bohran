# استفاده از نسخه 20 که با better-sqlite3 سازگار است
FROM node:20-alpine AS deps

# نصب ابزارهای لازم برای کامپایل native modules (مثل better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production


FROM node:20-alpine AS builder

# نصب ابزارهای لازم در مرحله builder
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

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]