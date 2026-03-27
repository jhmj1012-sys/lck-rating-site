'use client';

import { useEffect, useRef, useState } from "react";

import type { PublicUserSummary } from "./types";
import { Avatar } from "./ui";
import { cn, getInitials } from "./utils";

export function PublicUserTrigger({
  summary,
  label,
  className,
  align = "left",
}: {
  summary: PublicUserSummary | null;
  label: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (!summary) {
    return <span className={className}>{label}</span>;
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn("cursor-pointer transition hover:text-sky-700", className)}
      >
        {label}
      </button>
      {open ? (
        <div
          className={cn(
            "ui-card absolute top-full z-30 mt-2 w-72 p-4 text-left",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 text-sm font-bold text-slate-800">{getInitials(summary.nickname)}</Avatar>
            <div className="min-w-0">
              <div className="truncate text-base font-black text-slate-950">{summary.nickname}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{summary.bio}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="ui-card-soft px-3 py-3">
              <div className="text-[11px] text-slate-500">보유 코인</div>
              <div className="mt-1 text-sm font-black text-slate-950">{summary.points}</div>
            </div>
            <div className="ui-card-soft px-3 py-3">
              <div className="text-[11px] text-slate-500">적중률</div>
              <div className="mt-1 text-sm font-black text-slate-950">{summary.predictionAccuracy}%</div>
            </div>
            <div className="ui-card-soft px-3 py-3">
              <div className="text-[11px] text-slate-500">예측 성향</div>
              <div className="mt-1 text-sm font-black text-slate-950">{summary.predictionStyleLabel}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Lv.{summary.level} · 공개 프로필 기본 정보</div>
        </div>
      ) : null}
    </div>
  );
}
