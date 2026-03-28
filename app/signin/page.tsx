'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [pending, setPending] = useState(false);

  return (
    <main className="app-shell flex items-center justify-center px-4 py-10">
      <div className="ui-card w-full max-w-md p-8">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            구글 계정으로 바로 참여하기
            <br />
            필요한 정보만 안전하게 사용됩니다
          </p>
        </div>

        <div className="ui-card-soft mt-6 space-y-1 px-4 py-4 text-sm leading-6 text-slate-700">
          <div>✔ 승부예측 참여하기</div>
          <div>✔ 선수 평점 남기기</div>
          <div>✔ 나의 기록 쌓고 비교하기</div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await signIn("google", { callbackUrl: "/me?setup=1" });
              setPending(false);
            }}
            className="ui-action-primary flex w-full"
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
                구글로 3초 시작하기
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
