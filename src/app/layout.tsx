import type { Metadata } from "next";

import "./globals.css";

import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = {
  title: {
    default: zhCN.brand.name,
    template: `%s | ${zhCN.brand.name}`,
  },
  description: zhCN.brand.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
