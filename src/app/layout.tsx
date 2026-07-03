import "./globals.css";

export const metadata = {
  title: "همیار بحران - سامانه هوشمند مدیریت بحران",
  description: "سامانه هوشمند مدیریت بحران و روان‌بخشی همه‌جانبه برای مواجهه با حوادث اضطراری",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="font-sans bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}