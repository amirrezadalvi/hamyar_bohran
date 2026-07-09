FROM node:18-alpine AS builder
WORKDIR /app

# نصب ابزارهای مورد نیاز کامپایل بومی better-sqlite3
RUN apk add --no-cache python3 make g++

# کپی فایلهای وابستگی و نصب
COPY package.json package-lock.json* ./
RUN npm install

# کپی کامل کدها
COPY . .

# ساخت پوشه عمومی
RUN mkdir -p public

# بیلد پروژه Next.js
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# فعال‌سازی حالت پروداکشن برای خواندن شرط db.ts
ENV NODE_ENV=production

# رفع مشکل دسترسی دیسک‌ها در کوبرنتیز بر اساس مستندات هم‌روش
USER root
RUN mkdir -p /data && chmod 777 /data

# کپی فایل‌های خروجی بیلد
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# اجرای سرور مستقل
CMD ["node", "server.js"]