'use client';

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type React from "react";

export function BackNavButton({
  children,
  className,
  style,
  fallbackHref = "/",
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
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
      style={style}
    >
      {children}
    </button>
  );
}
