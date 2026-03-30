'use client';

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import type { PlayerRankingItem, PlayerRankingPageData, PlayerRole } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type SortKey = "rating" | "form" | "participation";
type PositionFilter = "ALL" | PlayerRole;

const ROLE_ICON: Record<PlayerRole, string> = {
  TOP: "/icons/positions/icon-position-top.png",
  JGL: "/icons/positions/icon-position-jungle.png",
  MID: "/icons/positions/icon-position-middle.png",
  ADC: "/icons/positions/icon-position-bottom.png",
  SUP: "/icons/positions/icon-position-utility.png",
};

function getRatingTone(value: number) {
  if (value >= 8.0) return "text-sky-600";
  if (value <= 7.0) return "text-slate-400";
  return "text-slate-900";
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
  const [major, minor] = value.toFixed(1).split(".");

  return (
    <span className={cn("font-black leading-none tracking-[-0.04em]", getRatingTone(value), "text-[20px]")}>
      {major}
      <span className="text-[14px]">.{minor}</span>
    </span>
  );
}

function getTopRankTone(rank: number) {
  if (rank === 1) return "bg-amber-50/80";
  if (rank === 2) return "bg-slate-100/80";
  if (rank === 3) return "bg-orange-50/80";
  return "bg-white";
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
    <main className="app-shell px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <h1 className="text-[30px] font-black tracking-[-0.04em] text-slate-950">평점 순위</h1>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(["ALL", "TOP", "JGL", "MID", "ADC", "SUP"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => startTransition(() => setPosition(item))}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition",
                        position === item
                          ? "bg-sky-50 text-sky-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                      )}
                    >
                      {item === "ALL" ? (
                        "전체"
                      ) : (
                        <Image src={ROLE_ICON[item]} alt={item} width={16} height={16} className="h-4 w-4 object-contain" />
                      )}
                    </button>
                  ))}
                </div>

                <label className="flex min-w-[132px] items-center gap-2">
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">시즌</span>
                  <select
                    value={season}
                    onChange={(event) => startTransition(() => setSeason(event.target.value))}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70"
                  >
                    {data.seasonOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-[132px] items-center gap-2">
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">정렬</span>
                  <select
                    value={sortKey}
                    onChange={(event) => startTransition(() => setSortKey(event.target.value as SortKey))}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70"
                  >
                    <option value="rating">평점순</option>
                    <option value="form">최근폼</option>
                    <option value="participation">참여수</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </section>

        {rankedRows.length === 0 ? (
          <section className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-14 text-center text-sm text-slate-500">
            조건에 맞는 선수가 없습니다
          </section>
        ) : (
          <section
            className={cn(
              "overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300",
              isPending ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
            )}
          >
            <div className="max-h-[640px] overflow-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[64px_minmax(0,1.4fr)_90px_120px_90px_94px_100px_130px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <div>순위</div>
                <div>선수명</div>
                <div>팀</div>
                <div>평균 평점</div>
                <div>경기 수</div>
                <div title="참여수 = 평점 참여 인원">참여수</div>
                <div title="최근폼 = 최근 5경기 평균">최근폼</div>
                <div className="text-right">상세</div>
              </div>
              <div className="divide-y divide-slate-100">
                {rankedRows.map((player) => (
                  <Link
                    key={player.playerId}
                    href={`/player/${player.playerId}`}
                    className={cn(
                      "group grid grid-cols-[64px_minmax(0,1.4fr)_90px_120px_90px_94px_100px_130px] items-center px-4 py-3 text-sm text-slate-700 transition hover:bg-sky-50/70",
                      getTopRankTone(player.rank),
                    )}
                  >
                    <div className={cn("font-black", player.rank <= 3 ? "text-slate-950" : "text-slate-900")}>{player.rank}</div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-950">{player.playerName}</div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                        <Image src={ROLE_ICON[player.role]} alt={player.role} width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                      </div>
                    </div>
                    <div className="font-semibold text-slate-700">{player.teamCode}</div>
                    <div className="font-black">
                      <RatingValue value={player.averageRating} />
                    </div>
                    <div className="font-semibold text-slate-400">{player.matchCount}</div>
                    <div className="font-semibold text-slate-400">{player.participationCount}</div>
                    <div className="font-semibold text-violet-600">{player.recentForm.toFixed(1)}</div>
                    <div className="text-right text-xs font-semibold text-slate-400 transition group-hover:text-sky-700">선수 상세 보기</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
