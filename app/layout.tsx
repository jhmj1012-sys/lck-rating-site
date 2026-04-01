import type { Metadata } from "next";

import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOL PRO RATING",
  description: "LCK 일정, 경기 예측, 세트 평점과 반응을 한곳에서 보는 참여형 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full" suppressHydrationWarning>
        <AuthSessionProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
