FROM docker.io/library/node:20-alpine AS builder
# نصب ابزارهای مورد نیاز برای کامپایل better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# کپی فایل پکیجی که ساختیم
COPY package.json ./
# به جای npm ci از npm install استفاده می‌کنیم چون package-lock نداریم
RUN npm install

# کپی کل پروژه
COPY . .

# بیلد نهایی پروژه Next.js
RUN npm run build

FROM docker.io/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# کپی فایل‌های خروجی کامپایل شده
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/database.sqlite ./database.sqlite

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]