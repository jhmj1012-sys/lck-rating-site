'use client';

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

import type { PlayerRankingItem, PlayerRankingPageData, PlayerRole } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type SortKey = "rating" | "form" | "participation";
type PositionFilter = "ALL" | PlayerRole;

function getRatingTone(value: number) {
  if (value >= 8.0) {
    return "text-sky-600";
  }
  if (value <= 7.0) {
    return "text-slate-400";
  }
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

function RatingValue({ value, large = false }: { value: number; large?: boolean }) {
  const [major, minor] = value.toFixed(2).split(".");

  return (
    <span className={cn("font-black leading-none tracking-[-0.04em]", getRatingTone(value), large ? "text-[48px]" : "text-[20px]")}>
      {major}
      <span className={large ? "text-[26px]" : "text-[14px]"}>.{minor}</span>
    </span>
  );
}

function TopPlayerCard({ player, rank, featured = false }: { player: PlayerRankingItem; rank: number; featured?: boolean }) {
  return (
    <Link
      href={`/player/${player.playerId}`}
      className={cn(
        "group rounded-[24px] border p-5 transition duration-200 hover:-translate-y-0.5",
        featured
          ? "border-sky-200 bg-[linear-gradient(135deg,#ebf8ff_0%,#ffffff_72%)] shadow-[0_24px_54px_rgba(14,165,233,0.20)]"
          : "border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-black", featured ? "text-sky-700" : "text-slate-700")}>{rank}위</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{player.role}</span>
      </div>
      <div className={cn("mt-3 font-black tracking-[-0.03em] text-slate-950", featured ? "text-[34px]" : "text-[26px]")}>{player.playerName}</div>
      <div className="text-sm font-semibold text-slate-500">{player.teamCode}</div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">평균 평점</div>
          <div className="mt-1">
            <RatingValue value={player.averageRating} large />
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div title="최근폼 = 최근 5경기 평균">
            최근폼 <span className="font-semibold text-violet-600">{player.recentForm.toFixed(2)}</span>
          </div>
          <div>경기 {player.matchCount}</div>
        </div>
      </div>
      <div className="mt-4 text-xs font-semibold text-slate-400 transition group-hover:text-sky-700">선수 상세 보기 →</div>
    </Link>
  );
}

export function PlayerRankingBoard({ data }: { data: PlayerRankingPageData }) {
  const [position, setPosition] = useState<PositionFilter>("ALL");
  const [season, setSeason] = useState(data.defaultSeason);
  const [minMatches, setMinMatches] = useState(data.minMatchDefault);
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const rows = data.players.filter((player) => {
      const roleMatch = position === "ALL" || player.role === position;
      const seasonMatch = player.seasonLabel === season;
      const minMatch = player.matchCount >= minMatches;
      return roleMatch && seasonMatch && minMatch;
    });

    return sortRows(rows, sortKey).map((player, index) => ({ ...player, rank: index + 1 }));
  }, [data.players, minMatches, position, season, sortKey]);

  const deferredFiltered = useDeferredValue(filtered);
  const first = deferredFiltered[0] ?? null;
  const second = deferredFiltered[1] ?? null;
  const third = deferredFiltered[2] ?? null;
  const tableRows = deferredFiltered.slice(3);

  return (
    <main className="app-shell px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-[1320px] space-y-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">PLAYER RANKING</div>
          <h1 className="mt-1.5 text-[30px] font-black tracking-[-0.04em] text-slate-950">{data.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{data.subtitle}</p>

          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-500">포지션</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["ALL", "TOP", "JGL", "MID", "ADC", "SUP"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => startTransition(() => setPosition(item))}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      position === item ? "bg-sky-500 text-white shadow-[0_8px_18px_rgba(14,165,233,0.28)]" : "bg-white text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {item === "ALL" ? "전체" : item}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-500">시즌</div>
              <select
                value={season}
                onChange={(event) => startTransition(() => setSeason(event.target.value))}
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              >
                {data.seasonOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-500">최소 경기수</div>
              <select
                value={minMatches}
                onChange={(event) => startTransition(() => setMinMatches(Number(event.target.value)))}
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              >
                <option value={3}>3경기 이상</option>
                <option value={5}>5경기 이상</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-500">정렬</div>
              <select
                value={sortKey}
                onChange={(event) => startTransition(() => setSortKey(event.target.value as SortKey))}
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              >
                <option value="rating">평점순</option>
                <option value="form">최근폼</option>
                <option value="participation">참여수</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["TOP", "JGL", "MID", "ADC", "SUP"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setPosition(role);
                    setSortKey("rating");
                  });
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  position === role ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                {role} Top5
              </button>
            ))}
          </div>
        </section>

        {deferredFiltered.length === 0 ? (
          <section className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-14 text-center text-sm text-slate-500">
            조건에 맞는 선수가 없습니다
          </section>
        ) : (
          <>
            <section className={cn("grid gap-4 lg:grid-cols-[1fr_1.35fr_1fr] transition-all duration-300", isPending ? "opacity-70 translate-y-1" : "opacity-100 translate-y-0")}>
              {second ? <TopPlayerCard player={second} rank={2} /> : <div />}
              {first ? <TopPlayerCard player={first} rank={1} featured /> : <div />}
              {third ? <TopPlayerCard player={third} rank={3} /> : <div />}
            </section>

            {tableRows.length > 0 ? (
              <section className={cn("overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300", isPending ? "opacity-70 translate-y-1" : "opacity-100 translate-y-0")}>
                <div className="max-h-[560px] overflow-auto">
                  <div className="sticky top-0 z-10 grid grid-cols-[64px_minmax(0,1.2fr)_84px_120px_90px_94px_100px_130px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <div>순위</div>
                    <div>선수명</div>
                    <div>팀</div>
                    <div>평균 평점</div>
                    <div>경기 수</div>
                    <div title="참여수 = 평점 참여 인원">참여 수</div>
                    <div title="최근폼 = 최근 5경기 평균">최근폼</div>
                    <div className="text-right">상세</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {tableRows.map((player) => (
                      <Link
                        key={player.playerId}
                        href={`/player/${player.playerId}`}
                        className="group grid grid-cols-[64px_minmax(0,1.2fr)_84px_120px_90px_94px_100px_130px] items-center px-4 py-3 text-sm text-slate-700 transition hover:bg-sky-50/70"
                      >
                        <div className="font-black text-slate-950">{player.rank}</div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-950">{player.playerName}</div>
                          <div className="text-xs text-slate-500">{player.role}</div>
                        </div>
                        <div className="font-semibold text-slate-700">{player.teamCode}</div>
                        <div className="font-black">
                          <RatingValue value={player.averageRating} />
                        </div>
                        <div className="font-semibold text-slate-400">{player.matchCount}</div>
                        <div className="font-semibold text-slate-400">{player.participationCount}</div>
                        <div className="font-semibold text-violet-600">{player.recentForm.toFixed(2)}</div>
                        <div className="text-right text-xs font-semibold text-slate-400 transition group-hover:text-sky-700">선수 상세 보기 →</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
