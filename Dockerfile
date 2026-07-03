# مرحله اول: نصب وابستگی‌ها
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# مرحله دوم: بیلد پروژه
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# نکته: مطمئن شو در next.config.js گزینه output: 'standalone' تنظیم شده است
RUN npm run build

# مرحله سوم: اجرای برنامه
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]