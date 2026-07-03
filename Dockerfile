FROM node:18-alpine AS builder
WORKDIR /app

# نصب ابزارهای مورد نیاز برای کامپایل پکیج‌های Native
RUN apk add --no-cache python3 make g++

# کپی فایل‌های پیکربندی
COPY package.json ./

# نصب تمیز پکیج‌ها در داخل داکر
RUN npm install

# کپی کردن کدها
COPY . .

# بیلد
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# مرحله نهایی
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]