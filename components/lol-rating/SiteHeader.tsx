'use client';

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import { SearchIcon, UserIcon } from "./icons";
import { Button, Input } from "./ui";

type SiteHeaderProps = {
  query: string;
  setQuery: (value: string) => void;
};

export function SiteHeader({ query, setQuery }: SiteHeaderProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isAdmin = session?.user?.role === "admin";
  const hasNickname = Boolean(session?.user?.hasNickname);
  const displayName = session?.user?.nickname || session?.user?.email?.split("@")[0] || "게스트";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-cyan-300 to-emerald-300 text-xs font-black tracking-[-0.03em] text-slate-950 shadow-[0_10px_24px_rgba(56,189,248,0.24)]">
                GG
              </div>
              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold tracking-[-0.03em] text-slate-950">GG 레이팅</div>
                <div className="truncate text-[12px] text-slate-500">LCK 일정, 예측, 세트 평점과 반응을 한 곳에서</div>
              </div>
            </Link>

            <div className="flex items-center gap-2 lg:hidden">
              <Link href="/teams" className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 px-3 text-[13px] font-medium text-slate-700">
                팀 로스터
              </Link>
              {isAdmin ? (
                <Link href="/admin" className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 px-3 text-[13px] font-medium text-slate-700">
                  관리자
                </Link>
              ) : null}
              {isLoggedIn ? (
                <>
                  <Link href="/me" className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 px-3 text-[13px] font-medium text-slate-700">
                    {displayName}
                  </Link>
                  <Button variant="ghost" className="h-10 px-3 text-[13px]" onClick={() => signOut()}>
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button className="h-10 px-3.5 text-[13px]" onClick={() => signIn("google", { callbackUrl: "/" })}>
                  Google 로그인
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2.5 lg:min-w-[720px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="팀, 선수, 경기 키워드를 검색해 보세요"
                className="h-10 rounded-[18px] border-slate-200/90 bg-slate-50 pl-10 pr-4 text-[13px] focus:bg-white"
              />
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/teams" className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 px-3.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                팀 로스터
              </Link>
              {!hasNickname && isLoggedIn ? (
                <Link href="/me?setup=1" className="inline-flex min-h-10 items-center rounded-2xl border border-amber-200 bg-amber-50 px-3.5 text-[13px] font-medium text-amber-800">
                  닉네임 설정
                </Link>
              ) : null}
              {isAdmin ? (
                <Link href="/admin" className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 px-3.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                  관리자
                </Link>
              ) : null}
              {isLoggedIn ? (
                <>
                  <Link href="/me" className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 px-3.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                    <UserIcon className="h-4 w-4" />
                    <span className="max-w-[148px] truncate">{displayName}</span>
                  </Link>
                  <Button variant="ghost" className="h-10 px-3.5 text-[13px]" onClick={() => signOut()}>
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button className="h-10 px-4 text-[13px]" onClick={() => signIn("google", { callbackUrl: "/" })}>
                  {status === "loading" ? "확인 중..." : "Google 로그인"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
