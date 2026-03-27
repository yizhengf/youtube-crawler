import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./providers";

export const metadata: Metadata = {
  title: "YouTube 爆款影片分析工具",
  description: "YouTube 頻道影片爬蟲與分析管理後台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-gray-50 text-gray-900 min-w-[1024px]">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
