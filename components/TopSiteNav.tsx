'use client';

import Link from "next/link";

import { SiteHeader } from "@/components/lol-rating/SiteHeader";
import type { NotificationItem } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type TopNavKey = "match" | "season" | "schedule" | "ratings";

export function TopSiteNav({
  active,
  notifications,
  unreadNotificationCount,
  maxWidthClass = "max-w-[1320px]",
}: {
  active: TopNavKey;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  maxWidthClass?: string;
}) {
  return (
    <>
      <SiteHeader
        notifications={notifications}
        unreadNotificationCount={unreadNotificationCount}
      />
      <div className="border-y border-slate-200/80 bg-white/90">
        <nav className={cn("mx-auto flex items-center gap-1 px-4 sm:px-6", maxWidthClass)}>
          <Link
            href="/"
            className={cn(
              "relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "match" ? "text-sky-700" : "text-slate-600 hover:text-slate-900",
            )}
          >
            홈
            {active === "match" ? <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-sky-500" /> : null}
          </Link>
          <Link
            href="/schedule"
            className={cn(
              "relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "schedule" ? "text-sky-700" : "text-slate-600 hover:text-slate-900",
            )}
          >
            경기일정
            {active === "schedule" ? <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-sky-500" /> : null}
          </Link>
          <Link
            href="/ratings"
            className={cn(
              "relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "ratings" ? "text-sky-700" : "text-slate-600 hover:text-slate-900",
            )}
          >
            평점순위
            {active === "ratings" ? <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-sky-500" /> : null}
          </Link>
          <Link
            href="/season-predictions"
            className={cn(
              "relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "season" ? "text-sky-700" : "text-slate-600 hover:text-slate-900",
            )}
          >
            시즌예측
            {active === "season" ? <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-sky-500" /> : null}
          </Link>
        </nav>
      </div>
    </>
  );
}
