import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CVForge — Free Professional CV Builder",
  description: "Create, customize and download a professional multilingual CV for free. No account and no watermark.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
