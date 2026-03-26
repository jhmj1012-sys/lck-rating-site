'use client';

import type { PropsWithChildren } from "react";
import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({ children }: PropsWithChildren) {
  return <SessionProvider>{children}</SessionProvider>;
}
