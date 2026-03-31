'use client';

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function BackNavButton({
  children,
  className,
  fallbackHref = "/",
}: {
  children: ReactNode;
  className?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
