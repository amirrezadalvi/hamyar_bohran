# ... (بخش‌های قبل را تغییر ندهید)

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# کپی کردن خروجی‌ها
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# اضافه کردن این خط برای اطمینان از وجود دیتابیس در کانتینر
COPY --from=builder /app/database.sqlite ./database.sqlite

EXPOSE 3000
CMD ["node", "server.js"]