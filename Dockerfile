FROM node:18-alpine AS builder
WORKDIR /app

# نصب ابزارهای کامپایل
RUN apk add --no-cache python3 make g++

# فقط فایل‌های مربوط به پکیج‌ها را کپی می‌کنیم
COPY package.json package-lock.json* ./

# نصب پکیج‌ها در محیط لینوکسی داکر
RUN npm install

# حالا کدها را کپی می‌کنیم
COPY . .

# بیلد پروژه
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]