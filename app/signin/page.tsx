import Link from "next/link";

export default function SignInPage() {
  const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const isGoogleReady = Boolean(googleClientId && googleClientSecret);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f8fbff_45%,#eef6ff_100%)] px-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600/70">Auth</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Google 계정으로 로그인하면 예측, 평점, 댓글, 마이페이지 기능을 사용할 수 있습니다.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {isGoogleReady ? (
            <Link
              href="/api/auth/signin/google"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              Google 로그인 계속하기
            </Link>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              `.env.local`에 Google OAuth 설정이 아직 없습니다.
              <br />
              `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL` 값을 먼저 넣어 주세요.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
