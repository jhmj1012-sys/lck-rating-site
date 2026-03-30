'use client';

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { GlobalSearchResultGroup, GlobalSearchResultItem, NotificationItem } from "./types";
import { BellIcon, SearchIcon, ShieldIcon, ShopIcon, TeamIcon, UserIcon } from "./icons";
import { Input } from "./ui";
import { cn } from "./utils";

type SiteHeaderProps = {
  notifications?: NotificationItem[];
  unreadNotificationCount?: number;
};

const HEADER_LABELS = {
  title: "GG 레이팅",
  teams: "팀 로스터",
  admin: "관리자",
  account: "내 계정",
  shop: "코인 상점",
  notifications: "알림",
  viewAllNotifications: "알림 자세히 보기",
  signin: "로그인",
  checking: "확인 중",
  searchPlaceholder: "팀, 선수, 경기 키워드를 검색해 보세요",
  searchEmpty: "검색 결과가 없습니다.",
  searchLoading: "검색 중...",
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

function AccountEntryButton({
  isLoggedIn,
  label,
  email,
}: {
  isLoggedIn: boolean;
  label: string;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  if (!isLoggedIn) {
    return (
      <Link
        href="/signin"
        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-sky-500 px-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(14,165,233,0.24)] transition hover:bg-sky-600"
      >
        <UserIcon className="h-4 w-4" />
        <span>로그인</span>
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <UserIcon className="h-4 w-4" />
        <span className="max-w-[90px] truncate">{label}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="truncate text-sm font-semibold text-slate-950">{label}</div>
            {email ? <div className="mt-0.5 truncate text-xs text-slate-500">{email}</div> : null}
          </div>
          <div className="p-2">
            <Link href="/me" className="flex min-h-10 items-center rounded-xl px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => setOpen(false)}>
              마이페이지
            </Link>
            <Link href="/notifications" className="flex min-h-10 items-center rounded-xl px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => setOpen(false)}>
              알림
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-[13px] font-medium text-rose-600 transition hover:bg-rose-50"
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : null}
    </div>
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

export function SiteHeader({ notifications = [], unreadNotificationCount = 0 }: SiteHeaderProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isAdmin = session?.user?.role === "admin";
  const accountLabel =
    (session?.user as { nickname?: string; name?: string } | undefined)?.nickname ??
    session?.user?.name ??
    HEADER_LABELS.account;
  const accountEmail = (session?.user as { email?: string } | undefined)?.email;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchGroups, setSearchGroups] = useState<GlobalSearchResultGroup[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const flatResults = useMemo(
    () => searchGroups.flatMap((group) => group.items),
    [searchGroups],
  );

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    setSearchInput(currentQuery);
    setDebouncedSearch(currentQuery);
    setHighlightedIndex(-1);
  }, [pathname, searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      setSearchGroups([]);
      setIsSearchLoading(false);
      setHighlightedIndex(-1);
      return;
    }

    const controller = new AbortController();
    setIsSearchLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=4`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("검색 실패");
        }
        const payload = (await response.json()) as { groups?: GlobalSearchResultGroup[] };
        setSearchGroups(payload.groups ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSearchGroups([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearchLoading(false);
          setHighlightedIndex(-1);
        }
      });

    return () => controller.abort();
  }, [debouncedSearch]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!searchWrapRef.current) {
        return;
      }
      if (!searchWrapRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const navigateTo = (href: string) => {
    setIsSearchOpen(false);
    setHighlightedIndex(-1);
    router.push(href);
  };

  const submitSearch = () => {
    const term = searchInput.trim();
    if (!term) {
      return;
    }
    navigateTo(`/search?q=${encodeURIComponent(term)}`);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsSearchOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatResults.length === 0) {
        return;
      }
      setIsSearchOpen(true);
      setHighlightedIndex((current) => (current + 1) % flatResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatResults.length === 0) {
        return;
      }
      setIsSearchOpen(true);
      setHighlightedIndex((current) => (current <= 0 ? flatResults.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (isSearchOpen && highlightedIndex >= 0 && highlightedIndex < flatResults.length) {
        navigateTo(flatResults[highlightedIndex].href);
        return;
      }
      submitSearch();
    }
  };

  const renderSearchItem = (item: GlobalSearchResultItem, index: number) => {
    const selected = index === highlightedIndex;

    return (
      <button
        key={`${item.type}_${item.id}`}
        type="button"
        onMouseEnter={() => setHighlightedIndex(index)}
        onClick={() => navigateTo(item.href)}
        className={cn(
          "w-full rounded-xl px-3 py-2 text-left transition",
          selected ? "bg-sky-50" : "hover:bg-slate-50",
        )}
      >
        <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
        <div className="truncate text-xs text-slate-500">{item.subtitle}</div>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-2.5 sm:px-6">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-cyan-300 to-emerald-300 text-xs font-black tracking-[-0.03em] text-slate-950 shadow-[0_10px_24px_rgba(56,189,248,0.24)]">
                GG
              </div>
              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold tracking-[-0.03em] text-slate-950">{HEADER_LABELS.title}</div>
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
              <AccountEntryButton isLoggedIn={isLoggedIn} label={accountLabel} email={accountEmail} />
            </div>
          </div>

          <div className="grid gap-2.5 lg:w-2/3 lg:min-w-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div ref={searchWrapRef} className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchInput.trim()) {
                    setIsSearchOpen(true);
                  }
                }}
                onKeyDown={onSearchKeyDown}
                placeholder={HEADER_LABELS.searchPlaceholder}
                className="h-10 rounded-[18px] border-slate-200/90 bg-slate-50 pl-12 pr-4 text-[13px] focus:bg-white"
                style={{ paddingLeft: "3rem" }}
              />

              {isSearchOpen && searchInput.trim() ? (
                <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.14)]">
                  {isSearchLoading ? (
                    <div className="px-3 py-3 text-sm text-slate-500">{HEADER_LABELS.searchLoading}</div>
                  ) : searchGroups.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-500">{HEADER_LABELS.searchEmpty}</div>
                  ) : (
                    <div className="space-y-1">
                      {(() => {
                        let rowIndex = 0;
                        return searchGroups.map((group) => {
                          const start = rowIndex;
                          rowIndex += group.items.length;

                          return (
                            <div key={group.type} className="rounded-xl border border-slate-100 bg-white/70 p-1">
                              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</div>
                              <div className="space-y-0.5">
                                {group.items.map((item, offset) => renderSearchItem(item, start + offset))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              ) : null}
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
              <AccountEntryButton isLoggedIn={isLoggedIn} label={accountLabel} email={accountEmail} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
