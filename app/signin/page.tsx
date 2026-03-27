'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [pending, setPending] = useState(false);

  return (
    <main className="app-shell flex items-center justify-center px-4 py-10">
      <div className="ui-card w-full max-w-md p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600/70">Auth</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Google 계정으로 로그인하면 경기 예측과 세트 평점에 참여하고, 코인을 모아 배지와 프로필 꾸미기에 사용할 수 있습니다.
          </p>
        </div>

        <div className="ui-card-soft mt-6 px-4 py-4 text-sm leading-6 text-slate-700">
          <div>예측 참여 +10 Coin</div>
          <div>예측 적중 시 추가 Coin</div>
          <div>세트 평점 저장 시 선수당 +2 Coin</div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await signIn("google", { callbackUrl: "/" });
              setPending(false);
            }}
            className="ui-action-primary flex w-full"
          >
            {pending ? "이동 중..." : "Google 로그인 계속하기"}
          </button>
        </div>
      </div>
    </main>
  );
}
