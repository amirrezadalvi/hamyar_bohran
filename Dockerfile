FROM node:18-alpine AS deps
WORKDIR /app
# کپی فایل package.json برای نصب پکیج‌ها
COPY package.json ./
RUN npm install

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# بیلد کردن پروژه
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
# Force rebuild
RUN echo "Rebuilding project"
ENV NODE_ENV=production
# کپی فایل‌های ضروری برای اجرا
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]