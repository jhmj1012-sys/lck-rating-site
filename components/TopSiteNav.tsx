'use client';

import Link from "next/link";

import { SiteHeader } from "@/components/lol-rating/SiteHeader";
import type { NotificationItem } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type TopNavKey = "match" | "season" | "schedule" | "ratings" | "games";

export function TopSiteNav({
  active,
  notifications,
  unreadNotificationCount,
  maxWidthClass = "max-w-5xl",
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
      <div className="border-y border-[#3B82F6]/45 bg-[#2563EB]">
        <nav className={cn("mx-auto flex items-center gap-1 px-4 sm:px-6", maxWidthClass)}>
          <Link
            href="/"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "match" ? "text-[#E6E8EB]" : "text-[#C7D7F3] hover:text-[#E6E8EB]",
            )}
          >
            홈
            {active === "match" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#3B82F6]" /> : null}
          </Link>
          <Link
            href="/schedule"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "schedule" ? "text-[#E6E8EB]" : "text-[#C7D7F3] hover:text-[#E6E8EB]",
            )}
          >
            경기일정
            {active === "schedule" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#3B82F6]" /> : null}
          </Link>
          <Link
            href="/ratings"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "ratings" ? "text-[#E6E8EB]" : "text-[#C7D7F3] hover:text-[#E6E8EB]",
            )}
          >
            평점순위
            {active === "ratings" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#3B82F6]" /> : null}
          </Link>
          <Link
            href="/season-predictions"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "season" ? "text-[#E6E8EB]" : "text-[#C7D7F3] hover:text-[#E6E8EB]",
            )}
          >
            시즌예측
            {active === "season" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#3B82F6]" /> : null}
          </Link>
          <Link
            href="/games/15-dollar-challenge"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              active === "games" ? "text-[#E6E8EB]" : "text-[#C7D7F3] hover:text-[#E6E8EB]",
            )}
          >
            게임
            {active === "games" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#3B82F6]" /> : null}
          </Link>
        </nav>
      </div>
    </>
  );
}



