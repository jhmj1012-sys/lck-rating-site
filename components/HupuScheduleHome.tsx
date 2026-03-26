'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

import { SidePanel } from "@/components/lol-rating/MatchCenter";
import { SiteHeader } from "@/components/lol-rating/SiteHeader";
import { TeamLogo, getTeamDisplayName } from "@/components/lol-rating/team-branding";
import type { MatchDateGroup, MatchMonthGroup, ScheduleHubData } from "@/components/lol-rating/types";
import { cn, getStatusLabel } from "@/components/lol-rating/utils";

function filterDates(dates: MatchDateGroup[], query: string, league: string, status: string) {
  const normalized = query.trim().toLowerCase();
  return dates
    .map((group) => ({
      ...group,
      matches: group.matches.filter((match) => {
        const matchesQuery =
          !normalized ||
          [match.teamA, match.teamB, match.league, match.stage]
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        const matchesLeague = league === "all" || match.league === league;
        const matchesStatus = status === "all" || match.status === status;
        return matchesQuery && matchesLeague && matchesStatus;
      }),
    }))
    .filter((group) => group.matches.length > 0);
}

function filterMonths(months: MatchMonthGroup[], query: string, league: string, status: string) {
  return months
    .map((month) => ({
      ...month,
      weeks: month.weeks
        .map((week) => ({
          ...week,
          dates: filterDates(week.dates, query, league, status),
        }))
        .filter((week) => week.dates.length > 0),
    }))
    .filter((month) => month.weeks.length > 0);
}

export default function HupuScheduleHome({ initialData }: { initialData: ScheduleHubData }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedMonthId, setSelectedMonthId] = useState(initialData.selectedMonthId ?? initialData.months[0]?.id ?? "");
  const [selectedWeekId, setSelectedWeekId] = useState(initialData.selectedWeekId ?? initialData.months[0]?.weeks[0]?.id ?? "");

  const leagues = useMemo(
    () => ["all", ...new Set(initialData.months.flatMap((month) => month.weeks.flatMap((week) => week.dates.flatMap((date) => date.matches.map((match) => match.league)))))],
    [initialData.months],
  );

  const filteredMonths = useMemo(
    () => filterMonths(initialData.months, query, league, status),
    [initialData.months, query, league, status],
  );

  const selectedMonth = filteredMonths.find((month) => month.id === selectedMonthId) ?? filteredMonths[0] ?? null;
  const selectedWeek = selectedMonth?.weeks.find((week) => week.id === selectedWeekId) ?? selectedMonth?.weeks[0] ?? null;

  return (
    <div className="min-h-screen bg-[linear-gradient(90deg,#c93d31_0%,#d74a36_18%,#f4f5f7_18%,#f4f5f7_82%,#be3129_82%,#be3129_100%)]">
      <SiteHeader query={query} setQuery={setQuery} />

      <main className="mx-auto max-w-[1260px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_292px]">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Schedule Hub</div>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">월별 일정과 주차별 경기 허브</h1>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <select
                      value={league}
                      onChange={(event) => setLeague(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700"
                    >
                      {leagues.map((item) => (
                        <option key={item} value={item}>
                          {item === "all" ? "전체 리그" : item}
                        </option>
                      ))}
                    </select>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700"
                    >
                      <option value="all">전체 상태</option>
                      <option value="scheduled">예정 경기</option>
                      <option value="finished">종료 경기</option>
                    </select>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">
                      월을 고른 뒤 주차를 눌러 날짜별 경기로 내려갑니다.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {filteredMonths.map((month) => (
                    <button
                      key={month.id}
                      onClick={() => {
                        setSelectedMonthId(month.id);
                        setSelectedWeekId(month.weeks[0]?.id ?? "");
                      }}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold transition",
                        selectedMonth?.id === month.id
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {month.label}
                    </button>
                  ))}
                </div>

                {selectedMonth ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedMonth.weeks.map((week) => (
                      <button
                        key={week.id}
                        onClick={() => setSelectedWeekId(week.id)}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-medium transition",
                          selectedWeek?.id === week.id
                            ? "bg-sky-100 text-sky-800"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        {week.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {selectedWeek ? (
                selectedWeek.dates.map((group) => (
                  <div key={group.id}>
                    <div className="bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 sm:px-6">{group.label}</div>
                    <div>
                      {group.matches.map((match) => {
                        const teamAWin = match.winnerTeamCode === match.teamA;
                        const teamBWin = match.winnerTeamCode === match.teamB;
                        const teamALabel = match.isFinished ? (teamAWin ? "승" : "패") : null;
                        const teamBLabel = match.isFinished ? (teamBWin ? "승" : "패") : null;

                        return (
                          <Link
                            key={match.id}
                            href={`/matches/${match.id}`}
                            className="grid gap-4 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[92px_minmax(0,1fr)_100px_minmax(0,1fr)_124px] sm:items-center sm:px-6"
                          >
                            <div>
                              <div className="text-[24px] font-black tracking-tight text-slate-900">{match.timeLabel}</div>
                              <div className="mt-1 text-xs font-medium text-slate-500">{match.stage}</div>
                            </div>

                            <div className={cn("flex items-center gap-3", teamAWin && "text-slate-950") }>
                              <TeamLogo team={match.teamA} size={40} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className={cn("truncate text-lg font-bold", teamAWin ? "text-slate-950" : "text-slate-700")}>{getTeamDisplayName(match.teamA)}</div>
                                  {teamALabel ? (
                                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", teamAWin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                      {teamALabel}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-slate-500">{match.league}</div>
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-3xl font-black tracking-tight text-slate-950">{match.score}</div>
                              <div className={cn("mt-1 text-xs font-semibold", match.isFinished ? "text-slate-700" : "text-sky-700")}>
                                {getStatusLabel(match.status)}
                              </div>
                            </div>

                            <div className={cn("flex items-center justify-start gap-3 sm:justify-end", teamBWin && "text-slate-950") }>
                              <div className="min-w-0 text-left sm:text-right">
                                <div className="flex items-center justify-start gap-2 sm:justify-end">
                                  {teamBLabel ? (
                                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", teamBWin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                      {teamBLabel}
                                    </span>
                                  ) : null}
                                  <div className={cn("truncate text-lg font-bold", teamBWin ? "text-slate-950" : "text-slate-700")}>{getTeamDisplayName(match.teamB)}</div>
                                </div>
                                <div className="text-xs text-slate-500">예측 {match.predictionVotes.toLocaleString()}</div>
                              </div>
                              <TeamLogo team={match.teamB} size={40} />
                            </div>

                            <div className="space-y-1 text-right text-sm text-slate-500">
                              <div>세트 평점 {match.ratingParticipants.toLocaleString()}</div>
                              <div className={cn(match.predictionLocked ? "text-slate-500" : "text-sky-700")}>
                                {match.predictionLocked ? "예측 마감" : "예측 진행 중"}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-14 text-center text-slate-500">조건에 맞는 경기나 주차가 없습니다.</div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <SidePanel profile={initialData.userProfile} />
            <aside className="rounded-[28px] border border-white/15 bg-white/10 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Guide</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">월과 주차를 따라 빠르게 보기</h2>
              <p className="mt-3 text-sm leading-7 text-white/80">
                상단에서 월을 고르고, 그 아래 주차를 누르면 날짜별 경기들이 바로 정리됩니다.
                경기 행은 좌우 팀 배치와 중앙 스코어 중심으로 바꿔서 누가 이겼는지 더 빨리 읽히게 했습니다.
              </p>
              <Link href="/teams" className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900">
                2026 1군 로스터 보기
              </Link>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
