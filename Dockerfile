# ۱. تغییر نسخه به node:20-alpine
FROM node:20-alpine AS deps

# نصب ابزارهای کامپایلر برای better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ۲. تغییر نسخه به node:20-alpine در مرحله builder
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ۳. تغییر نسخه به node:20-alpine در مرحله runner
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