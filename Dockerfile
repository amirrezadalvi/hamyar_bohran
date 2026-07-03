FROM node:18-alpine AS builder
WORKDIR /app

# نصب ابزارهای مورد نیاز برای کامپایل پکیج‌های Native
RUN apk add --no-cache python3 make g++

# کپی فایل‌های پیکربندی
COPY package.json ./

# نصب تمامی پکیج‌ها (dependencies و devDependencies)
# این دستور autoprefixer را هم نصب می‌کند
RUN npm install

# کپی کدها
COPY . .

# تنظیم حافظه و بیلد
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# مرحله نهایی (فقط فایل‌های بیلد شده)
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]