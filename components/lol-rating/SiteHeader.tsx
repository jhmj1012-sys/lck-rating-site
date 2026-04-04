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
  title: "LOL PRO RATING",
  teams: "팀 로스터",
  admin: "관리자",
  account: "내 계정",
  mypage: "마이페이지",
  shop: "코인 상점",
  more: "더보기",
  notifications: "알림",
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
      className="group relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#424254] text-white transition hover:bg-[#505063] hover:text-white"
    >
      {children}
      <span className="ui-header-tooltip pointer-events-none absolute -bottom-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#d7dce3] bg-white px-2 py-1 text-[11px] font-medium text-[#55677b] shadow-[0_8px_20px_rgba(32,45,55,0.1)] lg:group-hover:block lg:group-focus-visible:block">
        {label}
      </span>
    </Link>
  );
}

function AccountEntryButton({
  isLoggedIn,
  label,
  email,
  compact = false,
}: {
  isLoggedIn: boolean;
  label: string;
  email?: string;
  compact?: boolean;
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
        aria-label={HEADER_LABELS.signin}
        className={cn(
          "mobile-account-button inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#424254] text-sm font-semibold !text-[#FFFFFF] shadow-[0_8px_20px_rgba(2,6,23,0.28)] transition hover:bg-[#505063] hover:!text-[#FFFFFF]",
          compact ? "px-2.5 text-[13px]" : "px-3.5",
        )}
      >
        <UserIcon className="h-4 w-4 text-white" />
        {compact ? null : <span className="!text-[#FFFFFF]">로그인</span>}
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={HEADER_LABELS.mypage}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "mobile-account-button inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#424254] text-sm font-semibold text-white transition hover:bg-[#505063]",
          compact ? "px-2.5 text-[13px]" : "px-3.5",
        )}
      >
        <UserIcon className="h-4 w-4 text-white" />
        {compact ? null : <span className={cn("mobile-account-label truncate text-[#FFFFFF]", compact ? "max-w-[68px]" : "max-w-[90px]")}>{label}</span>}
        {compact ? null : <span className="text-[10px] text-white">▼</span>}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[220px] overflow-hidden rounded-2xl border border-[#474756] bg-[#31313C] shadow-[0_16px_36px_rgba(2,6,23,0.34)]">
          <div className="border-b border-[#474756] px-4 py-3">
            <div className="truncate text-sm font-semibold text-white">{label}</div>
            {email ? <div className="mt-0.5 truncate text-xs text-[#d6d6e5]">{email}</div> : null}
          </div>
          <div className="p-2">
            <Link
              href="/me"
              className="flex min-h-10 items-center rounded-xl px-3 !text-[14px] !font-medium !text-[#FFFFFF] transition hover:bg-[#3A3A47]"
              onClick={() => setOpen(false)}
            >
              {HEADER_LABELS.mypage}
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex min-h-10 w-full items-center rounded-xl px-3 text-left !text-[14px] !font-medium !text-[#FFFFFF] transition hover:bg-[#3A3A47]"
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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={HEADER_LABELS.notifications}
        onClick={() => setOpen((value) => !value)}
        className="mobile-header-icon group relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#424254] text-white transition hover:bg-[#505063] hover:text-white"
      >
        <BellIcon className="h-4 w-4 text-white" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#8B5CF6] px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <span className="ui-header-tooltip pointer-events-none absolute -bottom-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#d7dce3] bg-white px-2 py-1 text-[11px] font-medium text-[#55677b] shadow-[0_8px_20px_rgba(32,45,55,0.1)] lg:group-hover:block lg:group-focus-visible:block">
          {HEADER_LABELS.notifications}
        </span>
      </button>

      {open ? (
        <div className="fixed left-2 right-2 top-[4.2rem] z-50 overflow-hidden rounded-2xl border border-[#474756] bg-[#31313C] shadow-[0_16px_36px_rgba(2,6,23,0.34)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[320px]">
          <div className="border-b border-[#474756] px-4 py-3">
            <div className="text-sm font-semibold text-[#FFFFFF]">{HEADER_LABELS.notifications}</div>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[#d6d6e5]">최근 알림이 없습니다.</div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.relatedMatchId ? `/matches/${notification.relatedMatchId}` : "/"}
                  className="block border-b border-[#474756] px-4 py-3 transition hover:bg-[#3A3A47]"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#FFFFFF]">{notification.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#d6d6e5]">{notification.body}</div>
                    </div>
                    {notification.rewardCoins ? <div className="text-xs font-semibold text-[#8B5CF6]">+{notification.rewardCoins}</div> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#b6bfdc]">
                    <span>{notification.createdLabel}</span>
                    {!notification.isRead ? <span className="font-semibold text-[#8EADEF]">NEW</span> : null}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileMoreMenu({ isAdmin }: { isAdmin: boolean }) {
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

  return (
    <div ref={menuRef} className="relative lg:hidden">
      <button
        type="button"
        aria-label={HEADER_LABELS.more}
        onClick={() => setOpen((value) => !value)}
        className="mobile-header-icon inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#424254] text-white transition hover:bg-[#505063]"
      >
        <span className="text-xl leading-none text-white">⋯</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[200px] overflow-hidden rounded-2xl border border-[#474756] bg-[#31313C] p-2 shadow-[0_16px_36px_rgba(2,6,23,0.34)]">
          <Link
            href="/shop"
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 !text-[14px] !font-medium !text-[#FFFFFF] transition hover:bg-[#3A3A47] hover:!text-[#FFFFFF]"
            onClick={() => setOpen(false)}
          >
            <ShopIcon className="h-4 w-4 !text-[#FFFFFF]" />
            <span className="!text-[#FFFFFF]">{HEADER_LABELS.shop}</span>
          </Link>
          <Link
            href="/teams"
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 !text-[14px] !font-medium !text-[#FFFFFF] transition hover:bg-[#3A3A47] hover:!text-[#FFFFFF]"
            onClick={() => setOpen(false)}
          >
            <TeamIcon className="h-4 w-4 !text-[#FFFFFF]" />
            <span className="!text-[#FFFFFF]">{HEADER_LABELS.teams}</span>
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 !text-[14px] !font-medium !text-[#FFFFFF] transition hover:bg-[#3A3A47] hover:!text-[#FFFFFF]"
              onClick={() => setOpen(false)}
            >
              <ShieldIcon className="h-4 w-4 !text-[#FFFFFF]" />
              <span className="!text-[#FFFFFF]">{HEADER_LABELS.admin}</span>
            </Link>
          ) : null}
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
          selected ? "bg-[rgba(139,92,246,0.22)]" : "hover:bg-[#3A3A47]",
        )}
      >
        <div className="truncate text-sm font-semibold text-white">{item.title}</div>
        <div className="truncate text-xs text-[#d6d6e5]">{item.subtitle}</div>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-[#1C1C1F] shadow-[0_6px_18px_rgba(32,45,55,0.08)] backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-2.5 sm:px-6">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-2.5">
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#7C3AED] text-[20px] font-black tracking-[-0.03em] text-white shadow-[0_10px_24px_rgba(124,58,237,0.24)]">
                LPR
              </div>
              <div className="min-w-0">
                <div className="mobile-site-title truncate text-[18px] font-extrabold tracking-[-0.02em] text-white">
                  LOL PRO RATING
                </div>
                <div className="mt-0.5 truncate text-[11px] font-medium tracking-[-0.01em] text-[#8793B4]">평점으로 보는 LCK</div>
              </div>
            </Link>

            <div className="mobile-header-actions flex shrink-0 items-center gap-1.5 sm:gap-2 lg:hidden">
              {isLoggedIn ? <NotificationButton notifications={notifications} unreadCount={unreadNotificationCount} /> : null}
              <AccountEntryButton isLoggedIn={isLoggedIn} label={accountLabel} email={accountEmail} compact />
              <MobileMoreMenu isAdmin={isAdmin} />
            </div>
          </div>

          <div className="grid gap-2.5 lg:w-2/3 lg:min-w-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div ref={searchWrapRef} className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c8c8d6]" />
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
                className="h-10 rounded-[18px] !border-transparent !bg-[#424254] pl-12 pr-4 text-[13px] !text-[#FFFFFF] caret-[#FFFFFF] placeholder:text-[#9aa4af] focus:!border-transparent focus:!bg-[#424254] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.14)]"
                style={{ paddingLeft: "3rem" }}
              />

              {isSearchOpen && searchInput.trim() ? (
                <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-[#474756] bg-[#31313C] p-2 shadow-[0_16px_36px_rgba(2,6,23,0.34)]">
                  {isSearchLoading ? (
                    <div className="px-3 py-3 text-sm text-[#d6d6e5]">{HEADER_LABELS.searchLoading}</div>
                  ) : searchGroups.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-[#d6d6e5]">{HEADER_LABELS.searchEmpty}</div>
                  ) : (
                    <div className="space-y-1">
                      {(() => {
                        let rowIndex = 0;
                        return searchGroups.map((group) => {
                          const start = rowIndex;
                          rowIndex += group.items.length;

                          return (
                            <div key={group.type} className="rounded-xl border border-[#474756] bg-[#3A3A47] p-1">
                              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d6d6e5]">{group.label}</div>
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
              {isLoggedIn ? <NotificationButton notifications={notifications} unreadCount={unreadNotificationCount} /> : null}
              <IconNavLink href="/shop" label={HEADER_LABELS.shop}>
              <ShopIcon className="h-4 w-4 text-white" />
              </IconNavLink>
              <IconNavLink href="/teams" label={HEADER_LABELS.teams}>
              <TeamIcon className="h-4 w-4 text-white" />
              </IconNavLink>
              {isAdmin ? (
                <IconNavLink href="/admin" label={HEADER_LABELS.admin}>
                <ShieldIcon className="h-4 w-4 text-white" />
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
