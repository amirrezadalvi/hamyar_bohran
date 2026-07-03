FROM node:18-alpine AS builder
WORKDIR /app

# نصب ابزارهای مورد نیاز برای کامپایل کردن بهتر-اس‌کیوالیت
RUN apk add --no-cache python3 make g++

# کپی فایل‌های پیکربندی
COPY package.json ./

# نصب تمام وابستگی‌ها
RUN npm install

# کپی کردن کل پروژه
COPY . .

# اجرای بیلد
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# مرحله اجرای برنامه
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# کپی کردن خروجی بیلد از مرحله قبل
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]