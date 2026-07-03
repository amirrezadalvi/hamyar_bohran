# مرحله ۱: بیلد کردن پروژه
FROM node:20-alpine AS builder
WORKDIR /app

# کپی فایل‌های مربوط به پکیج‌ها
COPY package.json package-lock.json ./

# نصب پکیج‌ها (با --frozen-lockfile برای ثبات نسخه ها)
RUN npm ci

# کپی کردن کل سورس پروژه
COPY . .

# بیلد کردن پروژه (ساخت نسخه Standalone)
RUN npm run build

# مرحله ۲: ایجاد ایمیج نهایی برای اجرا
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# کپی کردن فایل‌های ضروری از مرحله قبل
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# اگر دیتابیس در روت است، این خط را حتماً داشته باش:
COPY --from=builder /app/database.sqlite ./database.sqlite

# پورت اپلیکیشن
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# اجرای سرور
CMD ["node", "server.js"]