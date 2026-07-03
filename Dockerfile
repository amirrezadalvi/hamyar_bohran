# مرحله اول: نصب وابستگی‌ها
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json ./
# استفاده از --no-dev=false برای اطمینان از نصب همه چیز از جمله devDependencies
RUN npm install

# مرحله دوم: بیلد پروژه
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# حالا چون tailwindcss در مرحله قبل نصب شده، اینجا پیدایش می‌کند
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