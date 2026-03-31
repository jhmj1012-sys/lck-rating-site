'use client';

import type { PublicUserSummary } from "./types";
import { cn } from "./utils";

export function PublicUserTrigger({
  summary,
  label,
  className,
  align,
}: {
  summary: PublicUserSummary | null;
  label: string;
  className?: string;
  align?: "left" | "right";
}) {
  void summary;
  void align;

  return <span className={cn("block w-full min-w-0 truncate text-left", className)}>{label}</span>;
}
