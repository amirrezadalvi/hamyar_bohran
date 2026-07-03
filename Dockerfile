# استفاده از ایمیجِ رسمی نود
FROM node:20-alpine

WORKDIR /app

# کپی کردن تمام فایل‌ها از جمله پوشه node_modules که در سیستم خودت نصب شده
COPY . .

# اجرای مستقیم سرور
EXPOSE 3000
CMD ["npm", "start"]