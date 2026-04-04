'use client';

import Link from "next/link";

import { SiteHeader } from "@/components/lol-rating/SiteHeader";
import type { NotificationItem } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type TopNavKey = "match" | "season" | "schedule" | "ratings" | "games" | "none";

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
      <div className="bg-[#7C3AED]">
        <div className={cn("mobile-tab-scroll mx-auto px-4 sm:px-6", maxWidthClass)}>
        <nav className="flex min-w-max items-center gap-1 whitespace-nowrap">
          <Link
            href="/"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#E2E8F0]",
            )}
            style={{ color: "#E2E8F0" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#E2E8F0";
            }}
          >
            홈
            {active === "match" ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#C4B5FD] sm:inset-x-4" /> : null}
          </Link>
          <Link
            href="/schedule"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#E2E8F0]",
            )}
            style={{ color: "#E2E8F0" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#E2E8F0";
            }}
          >
            경기일정
            {active === "schedule" ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#C4B5FD] sm:inset-x-4" /> : null}
          </Link>
          <Link
            href="/ratings"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#E2E8F0]",
            )}
            style={{ color: "#E2E8F0" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#E2E8F0";
            }}
          >
            평점순위
            {active === "ratings" ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#C4B5FD] sm:inset-x-4" /> : null}
          </Link>
          <Link
            href="/season-predictions"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#E2E8F0]",
            )}
            style={{ color: "#E2E8F0" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#E2E8F0";
            }}
          >
            시즌예측
            {active === "season" ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#C4B5FD] sm:inset-x-4" /> : null}
          </Link>
          <Link
            href="/games/15-dollar-challenge"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#E2E8F0]",
            )}
            style={{ color: "#E2E8F0" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#E2E8F0";
            }}
          >
            게임
            {active === "games" ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#C4B5FD] sm:inset-x-4" /> : null}
          </Link>
        </nav>
        </div>
      </div>
    </>
  );
}



