import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "代理店管理 - レベニューシェア管理システム",
  description: "SaaS代理店のレベニューシェアを管理するプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased text-[15px]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
