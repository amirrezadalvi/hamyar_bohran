FROM node:18-alpine AS builder
WORKDIR /app

# نصب ابزارهای مورد نیاز
RUN apk add --no-cache python3 make g++

# کپی فایل‌های پکیج و نصب
COPY package.json package-lock.json* ./
RUN npm install

# کپی کدها
COPY . .

# اطمینان از وجود پوشه public قبل از بیلد
RUN mkdir -p public

# بیلد
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# کپی فایل‌های ضروری از builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]