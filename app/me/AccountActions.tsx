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
        className="ui-action-secondary"
      >
        {nicknameLabel}
      </Link>
      <button
        type="button"
        aria-label="\uB85C\uADF8\uC544\uC6C3"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="ui-action-secondary"
      >
        {"\uB85C\uADF8\uC544\uC6C3"}
      </button>
    </div>
  );
}
