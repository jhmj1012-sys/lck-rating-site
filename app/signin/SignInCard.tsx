'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignInCard() {
  const [pending, setPending] = useState(false);

  return (
    <div className="w-full max-w-md rounded-[28px] bg-[#31313C] p-8">
      <div className="text-center">
        <h1 className="text-[30px] font-semibold tracking-tight text-[#FFFFFF]">로그인</h1>
        <p className="mt-3 text-sm leading-6 text-[#D4DCFF]">
          구글 계정으로 바로 참여하기
          <br />
          필요한 정보만 안전하게 사용합니다.
        </p>
      </div>

      <div className="mt-6 space-y-1 rounded-2xl bg-[#3A3A47] px-4 py-4 text-center text-sm leading-6 text-[#D4DCFF]">
        <div>실시간 예측 참여하기</div>
        <div>매치별 점수 맞히기</div>
        <div>나와 팀원 기록 비교하기</div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const query = new URLSearchParams(window.location.search);
            const rawCallbackUrl = query.get("callbackUrl");
            const callbackUrl = rawCallbackUrl && rawCallbackUrl.startsWith("/") ? rawCallbackUrl : "/";
            await signIn("google", { callbackUrl });
            setPending(false);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5383E8] px-4 py-3 text-sm font-medium !text-[#FFFFFF] transition hover:bg-[#6C98EE] hover:!text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            "이동 중..."
          ) : (
            <>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M23.49 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.64Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 24c3.24 0 5.96-1.07 7.95-2.89l-3.86-3c-1.07.72-2.43 1.14-4.09 1.14-3.14 0-5.8-2.12-6.75-4.97H1.27v3.1A12 12 0 0 0 12 24Z"
                  fill="#34A853"
                />
                <path
                  d="M5.25 14.28A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.37-2.28V6.62H1.27A12 12 0 0 0 0 12c0 1.94.47 3.77 1.27 5.38l3.98-3.1Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.08 15.23 0 12 0A12 12 0 0 0 1.27 6.62l3.98 3.1C6.2 6.88 8.86 4.77 12 4.77Z"
                  fill="#EA4335"
                />
              </svg>
              구글로 3초 만에 시작하기
            </>
          )}
        </button>
      </div>
    </div>
  );
}
