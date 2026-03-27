import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./providers";

export const metadata: Metadata = {
  title: "AI 影片工廠 MVP",
  description: "YouTube 頻道研究、影片資料庫、任務中心與設定管理",
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
