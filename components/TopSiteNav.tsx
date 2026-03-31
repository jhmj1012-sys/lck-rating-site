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
      <div className="border-b border-[#B95A31] bg-[#D96C3F]">
        <nav className={cn("mx-auto flex items-center gap-1 px-4 sm:px-6", maxWidthClass)}>
          <Link
            href="/"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#DDE9FF]",
            )}
            style={{ color: "#DDE9FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#A9C2F5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#DDE9FF";
            }}
          >
            홈
            {active === "match" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/schedule"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#DDE9FF]",
            )}
            style={{ color: "#DDE9FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#A9C2F5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#DDE9FF";
            }}
          >
            경기일정
            {active === "schedule" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/ratings"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#DDE9FF]",
            )}
            style={{ color: "#DDE9FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#A9C2F5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#DDE9FF";
            }}
          >
            평점순위
            {active === "ratings" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/season-predictions"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#DDE9FF]",
            )}
            style={{ color: "#DDE9FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#A9C2F5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#DDE9FF";
            }}
          >
            시즌예측
            {active === "season" ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-white" /> : null}
          </Link>
          <Link
            href="/games/15-dollar-challenge"
            className={cn(
              "relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-[#DDE9FF]",
            )}
            style={{ color: "#DDE9FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#A9C2F5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#DDE9FF";
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



