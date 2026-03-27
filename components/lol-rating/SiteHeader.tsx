'use client';

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";

import type { NotificationItem } from "./types";
import { BellIcon, SearchIcon, ShieldIcon, ShopIcon, TeamIcon, UserIcon } from "./icons";
import { Input } from "./ui";

type SiteHeaderProps = {
  query: string;
  setQuery: (value: string) => void;
  notifications?: NotificationItem[];
  unreadNotificationCount?: number;
};

const HEADER_LABELS = {
  title: "GG \uB808\uC774\uD305",
  subtitle: "LCK \uC77C\uC815, \uC608\uCE21, \uC138\uD2B8 \uD3C9\uC810\uACFC \uBC18\uC751\uC744 \uD55C \uACF3\uC5D0\uC11C",
  teams: "\uD300 \uB85C\uC2A4\uD130",
  admin: "\uAD00\uB9AC\uC790",
  account: "\uB0B4 \uACC4\uC815",
  shop: "\uCF54\uC778 \uC0C1\uC810",
  notifications: "\uC54C\uB9BC",
  viewAllNotifications: "\uC54C\uB9BC \uC790\uC138\uD788 \uBCF4\uAE30",
  signin: "\uB85C\uADF8\uC778",
  checking: "\uD655\uC778 \uC911",
  searchPlaceholder: "\uD300, \uC120\uC218, \uACBD\uAE30 \uD0A4\uC6CC\uB4DC\uB97C \uAC80\uC0C9\uD574 \uBCF4\uC138\uC694",
} as const;

function IconNavLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="ui-icon-button group relative"
    >
      {children}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white lg:group-hover:block lg:group-focus-visible:block">
        {label}
      </span>
    </Link>
  );
}

function NotificationButton({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={HEADER_LABELS.notifications}
        onClick={() => setOpen((value) => !value)}
        className="ui-icon-button group relative"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <span className="pointer-events-none absolute -bottom-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white lg:group-hover:block lg:group-focus-visible:block">
          {HEADER_LABELS.notifications}
        </span>
      </button>

      {open ? (
        <div className="ui-card absolute right-0 top-12 z-50 w-[320px] overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-bold text-slate-950">{HEADER_LABELS.notifications}</div>
            <div className="mt-1 text-xs text-slate-500">정산 결과와 코인 획득 내역을 바로 확인할 수 있습니다.</div>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">최근 알림이 없습니다.</div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.relatedMatchId ? `/matches/${notification.relatedMatchId}` : "/notifications"}
                  className="block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{notification.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.body}</div>
                    </div>
                    {notification.rewardCoins ? <div className="text-xs font-semibold text-emerald-600">+{notification.rewardCoins}</div> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span>{notification.createdLabel}</span>
                    {!notification.isRead ? <span className="font-semibold text-sky-600">NEW</span> : null}
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <Link href="/notifications" className="text-sm font-semibold text-sky-700" onClick={() => setOpen(false)}>
              {HEADER_LABELS.viewAllNotifications}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({ query, setQuery, notifications = [], unreadNotificationCount = 0 }: SiteHeaderProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-cyan-300 to-emerald-300 text-xs font-black tracking-[-0.03em] text-slate-950 shadow-[0_10px_24px_rgba(56,189,248,0.24)]">
                GG
              </div>
              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold tracking-[-0.03em] text-slate-950">{HEADER_LABELS.title}</div>
                <div className="truncate text-[12px] text-slate-500">{HEADER_LABELS.subtitle}</div>
              </div>
            </Link>

            <div className="flex items-center gap-2 lg:hidden">
              <NotificationButton notifications={notifications} unreadCount={unreadNotificationCount} />
              <IconNavLink href="/shop" label={HEADER_LABELS.shop}>
                <ShopIcon className="h-4 w-4" />
              </IconNavLink>
              <IconNavLink href="/teams" label={HEADER_LABELS.teams}>
                <TeamIcon className="h-4 w-4" />
              </IconNavLink>
              {isAdmin ? (
                <IconNavLink href="/admin" label={HEADER_LABELS.admin}>
                  <ShieldIcon className="h-4 w-4" />
                </IconNavLink>
              ) : null}
              {isLoggedIn ? (
                <IconNavLink href="/me" label={HEADER_LABELS.account}>
                  <UserIcon className="h-4 w-4" />
                </IconNavLink>
              ) : (
                <IconNavLink href="/signin" label={HEADER_LABELS.signin}>
                  <UserIcon className="h-4 w-4" />
                </IconNavLink>
              )}
            </div>
          </div>

          <div className="grid gap-2.5 lg:min-w-[720px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={HEADER_LABELS.searchPlaceholder}
                className="h-10 rounded-[18px] border-slate-200/90 bg-slate-50 pl-12 pr-4 text-[13px] focus:bg-white"
                style={{ paddingLeft: "3rem" }}
              />
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <NotificationButton notifications={notifications} unreadCount={unreadNotificationCount} />
              <IconNavLink href="/shop" label={HEADER_LABELS.shop}>
                <ShopIcon className="h-4 w-4" />
              </IconNavLink>
              <IconNavLink href="/teams" label={HEADER_LABELS.teams}>
                <TeamIcon className="h-4 w-4" />
              </IconNavLink>
              {isAdmin ? (
                <IconNavLink href="/admin" label={HEADER_LABELS.admin}>
                  <ShieldIcon className="h-4 w-4" />
                </IconNavLink>
              ) : null}
              {isLoggedIn ? (
                <IconNavLink href="/me" label={HEADER_LABELS.account}>
                  <UserIcon className="h-4 w-4" />
                </IconNavLink>
              ) : (
                <IconNavLink href="/signin" label={status === "loading" ? HEADER_LABELS.checking : HEADER_LABELS.signin}>
                  <UserIcon className="h-4 w-4" />
                </IconNavLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
