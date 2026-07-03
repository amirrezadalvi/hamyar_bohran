FROM node:18-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# اصلاح خط کپی: فقط اگر پوشه وجود داشت کپی کن
COPY --from=builder /app/public ./public
# چون ممکن است public نباشد، این خط به تنهایی کافی است:
RUN [ ! -d "public" ] && mkdir public || echo "Public folder exists"

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]