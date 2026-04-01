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
      <div className="border-b border-[#6D28D9] bg-[#8B5CF6]">
        <nav className={cn("mx-auto flex items-center gap-1 px-4 sm:px-6", maxWidthClass)}>
          <Link
            href="/"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            홈
            {active === "match" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/schedule"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            경기일정
            {active === "schedule" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/ratings"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            평점순위
            {active === "ratings" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/season-predictions"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            시즌예측
            {active === "season" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/games/15-dollar-challenge"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            게임
            {active === "games" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
        </nav>
      </div>
    </>
  );
}



