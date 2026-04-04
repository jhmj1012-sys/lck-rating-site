'use client';

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import type { PlayerRankingItem, PlayerRankingPageData, PlayerRole } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type SortKey = "rating" | "form" | "participation";
type PositionFilter = "ALL" | PlayerRole;

const ROLE_ICON: Record<PlayerRole, string> = {
  TOP: "/icons/positions/icon-position-top-disabled.png",
  JGL: "/icons/positions/icon-position-jungle-disabled.png",
  MID: "/icons/positions/icon-position-middle-disabled.png",
  ADC: "/icons/positions/icon-position-bottom-disabled.png",
  SUP: "/icons/positions/icon-position-utility-disabled.png",
};

function getRatingTone(value: number) {
  void value;
  return "text-white";
}

function sortRows(rows: PlayerRankingItem[], sort: SortKey) {
  const sorted = rows.slice();

  if (sort === "form") {
    sorted.sort(
      (a, b) =>
        b.recentForm - a.recentForm ||
        b.averageRating - a.averageRating ||
        b.participationCount - a.participationCount ||
        a.playerName.localeCompare(b.playerName, "ko"),
    );
    return sorted;
  }

  if (sort === "participation") {
    sorted.sort(
      (a, b) =>
        b.participationCount - a.participationCount ||
        b.averageRating - a.averageRating ||
        b.recentForm - a.recentForm ||
        a.playerName.localeCompare(b.playerName, "ko"),
    );
    return sorted;
  }

  sorted.sort(
    (a, b) =>
      b.averageRating - a.averageRating ||
      b.recentForm - a.recentForm ||
      b.participationCount - a.participationCount ||
      a.playerName.localeCompare(b.playerName, "ko"),
  );

  return sorted;
}

function RatingValue({ value }: { value: number }) {
  return (
    <span className={cn("font-black leading-none tracking-[-0.04em] text-[18px]", getRatingTone(value))}>
      {value.toFixed(1)}
    </span>
  );
}

export function PlayerRankingBoard({ data }: { data: PlayerRankingPageData }) {
  const [position, setPosition] = useState<PositionFilter>("ALL");
  const [season, setSeason] = useState(data.defaultSeason);
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [isPending, startTransition] = useTransition();

  const rankedRows = useMemo(() => {
    const rows = data.players.filter((player) => {
      const roleMatch = position === "ALL" || player.role === position;
      const seasonMatch = player.seasonLabel === season;
      return roleMatch && seasonMatch;
    });

    return sortRows(rows, sortKey).map((player, index) => ({ ...player, rank: index + 1 }));
  }, [data.players, position, season, sortKey]);

  return (
    <main className="min-h-screen bg-[#1C1C1F] px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4 lg:pl-2">
        <section
          className={cn(
            "overflow-hidden rounded-[24px] bg-[#31313C] shadow-[0_14px_36px_rgba(2,6,23,0.28)] transition-all duration-300",
            isPending ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
          )}
        >
          <div className="border-b border-[#474756] bg-[#3A3A47] px-4 py-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex h-8 items-center rounded-lg bg-[#31313C] p-0.5">
                  {(["ALL", "TOP", "JGL", "MID", "ADC", "SUP"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => startTransition(() => setPosition(item))}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md bg-[#31313C] px-2.5 py-1 text-xs font-semibold transition",
                        position === item
                          ? "bg-[#8B5CF6] text-white"
                          : "text-[#d6d6e5] hover:bg-[#3A3A47] hover:text-white",
                      )}
                    >
                      {item === "ALL" ? (
                        <Image src="/icons/positions/icon-position-fill.png" alt="ALL" width={19} height={19} className="h-[19px] w-[19px] object-contain brightness-125" />
                      ) : (
                        <Image src={ROLE_ICON[item]} alt={item} width={19} height={19} className="h-[19px] w-[19px] object-contain brightness-125" />
                      )}
                    </button>
                  ))}
                </div>

                <label className="flex min-w-[132px] items-center gap-2">
                  <select
                    value={season}
                    onChange={(event) => startTransition(() => setSeason(event.target.value))}
                    className="h-8 w-full rounded-lg border-0 bg-[#31313C] px-2.5 text-sm !text-[#FFFFFF] outline-none transition focus:ring-0"
                    style={{ color: "#FFFFFF" }}
                  >
                    {data.seasonOptions.map((item) => (
                      <option key={item} value={item} style={{ color: "#FFFFFF", backgroundColor: "#31313C" }}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-[132px] items-center gap-2">
                  <select
                    value={sortKey}
                    onChange={(event) => startTransition(() => setSortKey(event.target.value as SortKey))}
                    className="h-8 w-full rounded-lg border-0 bg-[#31313C] px-2.5 text-sm !text-[#FFFFFF] outline-none transition focus:ring-0"
                    style={{ color: "#FFFFFF" }}
                  >
                    <option value="rating" style={{ color: "#FFFFFF", backgroundColor: "#31313C" }}>평점순</option>
                    <option value="form" style={{ color: "#FFFFFF", backgroundColor: "#31313C" }}>최근순</option>
                    <option value="participation" style={{ color: "#FFFFFF", backgroundColor: "#31313C" }}>참여순</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {rankedRows.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-[#d6d6e5]">
              조건에 맞는 선수가 없습니다
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[44px_minmax(0,1fr)_56px_88px] bg-[#3A3A47] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#d6d6e5] md:grid-cols-[64px_minmax(0,1.4fr)_90px_120px_90px_100px]">
                <div>순위</div>
                <div>선수명</div>
                <div>팀</div>
                <div className="text-right pr-2">평균 평점</div>
                <div className="hidden md:block">경기 수</div>
                <div className="hidden md:block" title="최근폼 = 최근 5경기 평균">최근폼</div>
              </div>
              <div className="divide-y divide-[#474756]">
                {rankedRows.map((player) => (
                  <Link
                    key={player.playerId}
                    href={`/player/${player.playerSlug}`}
                    className="group grid grid-cols-[44px_minmax(0,1fr)_56px_88px] items-center bg-[#31313C] px-4 py-3 text-sm text-white transition hover:bg-[#3A3A47] md:grid-cols-[64px_minmax(0,1.4fr)_90px_120px_90px_100px]"
                  >
                    <div className="font-black text-white">{player.rank}</div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-white">{player.playerName}</div>
                    </div>
                    <div className="font-semibold text-white">{player.teamCode}</div>
                    <div className="font-black flex justify-end pr-2">
                      <RatingValue value={player.averageRating} />
                    </div>
                    <div className="hidden font-semibold text-[#d6d6e5] md:block">{player.matchCount}</div>
                    <div className="hidden font-semibold text-[#8EADEF] md:block">{player.recentForm.toFixed(1)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
