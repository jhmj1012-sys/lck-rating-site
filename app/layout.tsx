import type { Metadata } from "next";

import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GG 레이팅",
  description: "리그 일정부터 경기 예측, 세트 평점, 댓글 반응까지 한곳에서 보는 e스포츠 레이팅 서비스",
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
