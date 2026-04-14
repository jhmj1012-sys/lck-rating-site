import type { Metadata } from "next";
import localFont from "next/font/local";
import { SpeedInsights } from '@vercel/speed-insights/next';

import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  display: "swap",
  variable: "--font-pretendard",
  fallback: ["Pretendard Variable", "SUIT Variable", "Noto Sans KR", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "LOL PRO RATING",
  description: "LCK 일정, 경기 예측, 경기 평점과 반응을 한곳에서 보는 참여형 서비스",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`h-full antialiased ${pretendard.variable}`}>
      <body className="min-h-full overflow-x-hidden" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>

        <SpeedInsights />
      </body>
    </html>
  );
}
