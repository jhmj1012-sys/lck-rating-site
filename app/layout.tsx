import type { Metadata } from "next";

import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GG 레이팅",
  description: "LCK 일정, 승부예측, 세트 평점과 팬 반응을 한 곳에서 보는 참여형 팬 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
