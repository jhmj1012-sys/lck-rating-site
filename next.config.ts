import type { NextConfig } from "next";

const securityHeaders = [
  // 클릭재킹 방지: 사이트를 iframe에 삽입 불가
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // MIME 스니핑 방지: 브라우저가 Content-Type을 임의로 추측하지 않음
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // 리퍼러 정보 제한: 같은 출처엔 전체 URL, 외부엔 origin만 전달
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // 브라우저 기능 제한: 카메라, 마이크, 위치정보 등 불필요한 API 차단
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // HTTPS 강제: 1년간 HTTPS로만 접속 (서브도메인 포함)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // XSS 방지 및 리소스 출처 제한 (CSP)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js 인라인 스크립트 + Google OAuth 팝업
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      // 스타일: 인라인 허용 (Tailwind CSS 동작에 필요)
      "style-src 'self' 'unsafe-inline'",
      // 이미지: 자체 + data URI + 외부 https (팀/선수 이미지)
      "img-src 'self' data: https:",
      // 폰트: 자체 출처만
      "font-src 'self'",
      // API 연결: 자체 + Supabase
      "connect-src 'self' https://*.supabase.co",
      // Google OAuth iframe
      "frame-src https://accounts.google.com",
      // form 제출: 자체 + Google OAuth
      "form-action 'self' https://accounts.google.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 모든 경로에 보안 헤더 적용
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
