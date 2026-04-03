import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';

import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["Pretendard", "Pretendard Variable", "SUIT Variable", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "LOL PRO RATING",
  description: "LCK 일정, 경기 예측, 경기 평점과 반응을 한곳에서 보는 참여형 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`h-full antialiased ${notoSansKr.variable}`}>
      <body className="min-h-full" suppressHydrationWarning>
        <AuthSessionProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </AuthSessionProvider>

        <SpeedInsights />
      </body>
    </html>
  );
}
