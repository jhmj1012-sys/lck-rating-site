'use client';

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AccountActions({ hasNickname }: { hasNickname: boolean }) {
  const nicknameLabel = hasNickname ? "\uB2C9\uB124\uC784 \uBCC0\uACBD" : "\uB2C9\uB124\uC784 \uC124\uC815";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/me?setup=1"
        aria-label={nicknameLabel}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
      >
        {nicknameLabel}
      </Link>
      <button
        type="button"
        aria-label="\uB85C\uADF8\uC544\uC6C3"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
      >
        {"\uB85C\uADF8\uC544\uC6C3"}
      </button>
    </div>
  );
}
