'use client';

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type { DashboardData } from "./lol-rating/types";
import { CommentsSection, MatchHero, PredictionSection, RatingsSection, SidePanel } from "./lol-rating/MatchCenter";
import { OverviewSection } from "./lol-rating/OverviewSection";
import { ScheduleSection } from "./lol-rating/ScheduleSection";
import { SiteHeader } from "./lol-rating/SiteHeader";
import { Button } from "./lol-rating/ui";
import { filterWeeklySchedule, flattenMatches, isPredictionOpen } from "./lol-rating/utils";

type MainTab = "home" | "schedule" | "prediction" | "ratings";
type SelectionSource = "initial" | "home" | "schedule" | "prediction-nav";

const mainTabs: Array<{ id: MainTab; label: string; description: string }> = [
  { id: "home", label: "홈", description: "핵심 경기와 반응 요약" },
  { id: "schedule", label: "일정", description: "주차별 경기 탐색" },
  { id: "prediction", label: "예측", description: "승부예측 참여 및 확인" },
  { id: "ratings", label: "평점", description: "선수 평점과 댓글 반응" },
];

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    return payload.error ?? "요청을 처리하지 못했습니다.";
  }

  return null;
}

export default function LolRatingSiteMVP({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const { status } = useSession();
  const [query, setQuery] = useState("");
  const [openWeekId, setOpenWeekId] = useState(initialData.weeklySchedule[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(initialData.featuredMatchId ?? initialData.weeklySchedule[0]?.matches[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [selectionSource, setSelectionSource] = useState<SelectionSource>("initial");

  const filteredSchedule = useMemo(() => filterWeeklySchedule(initialData.weeklySchedule, query), [initialData.weeklySchedule, query]);
  const flatMatches = useMemo(() => flattenMatches(filteredSchedule), [filteredSchedule]);
  const allMatches = useMemo(() => flattenMatches(initialData.weeklySchedule), [initialData.weeklySchedule]);
  const activeMatch = flatMatches.find((match) => match.id === selectedId) ?? allMatches.find((match) => match.id === selectedId) ?? allMatches[0];
  const predictionCandidates = useMemo(
    () => allMatches.filter((match) => match.status === "scheduled" && !match.predictionLocked),
    [allMatches],
  );
  const preferredPredictionMatch = useMemo(
    () => predictionCandidates.find((match) => !match.myPredictionTeam) ?? predictionCandidates[0] ?? activeMatch,
    [activeMatch, predictionCandidates],
  );
  const predictionMatch =
    activeTab === "prediction" &&
    activeMatch &&
    !isPredictionOpen(activeMatch) &&
    selectionSource !== "schedule" &&
    preferredPredictionMatch
      ? preferredPredictionMatch
      : activeMatch;
  const canWrite = status === "authenticated";

  if (!activeMatch) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f8fbff_45%,#eef6ff_100%)] text-slate-900">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            등록된 경기가 없습니다. 관리자 페이지에서 첫 경기를 만들어 주세요.
          </div>
        </main>
      </div>
    );
  }

  const refreshData = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f8fbff_45%,#eef6ff_100%)] text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <section className="mb-5 rounded-[24px] border border-slate-200 bg-white/92 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="grid gap-2 md:grid-cols-4">
            {mainTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-[18px] border px-4 py-2.5 text-left transition ${
                    isActive
                      ? "border-sky-300 bg-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600/70">Menu</div>
                  <div className="mt-1 text-lg font-bold tracking-[-0.03em] text-slate-950">{tab.label}</div>
                  <div className="mt-1 text-[13px] text-slate-500">{tab.description}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_292px] 2xl:grid-cols-[minmax(0,1fr)_308px]">
          <div className="min-w-0 space-y-6">
            {activeTab === "home" ? (
              <>
                <OverviewSection
                  matches={allMatches}
                  onOpen={(id) => {
                    setSelectedId(id);
                    setSelectionSource("home");
                    setActiveTab("prediction");
                  }}
                />
                <MatchHero match={activeMatch} />
                <CommentsSection
                  key={`home-comments-${activeMatch.id}-${activeMatch.comments}`}
                  match={activeMatch}
                  canWrite={canWrite}
                  onSubmit={async (text) => {
                    const error = await postJson(`/api/matches/${activeMatch.id}/comments`, { text });
                    if (!error) {
                      refreshData();
                    }
                    return error;
                  }}
                />
              </>
            ) : null}

            {activeTab === "schedule" ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600/70">Schedule Mode</div>
                    <div className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950">경기를 고르면 바로 예측과 평점 흐름을 확인할 수 있습니다.</div>
                  </div>
                  <Button variant="secondary" onClick={() => setActiveTab("prediction")}>
                    선택 경기 예측 보기
                  </Button>
                </div>
                <ScheduleSection
                  schedule={filteredSchedule}
                  openWeekId={openWeekId}
                  activeMatchId={selectedId}
                  onToggleWeek={(weekId) => setOpenWeekId(openWeekId === weekId ? "" : weekId)}
                  onOpenMatch={(id) => {
                    setSelectedId(id);
                    setSelectionSource("schedule");
                    setActiveTab("prediction");
                  }}
                />
              </>
            ) : null}

            {activeTab === "prediction" ? (
              <>
                <MatchHero match={predictionMatch} />
                <PredictionSection
                  key={`prediction-${predictionMatch.id}-${predictionMatch.myPredictionTeam ?? "none"}-${predictionMatch.predictionSummary.totalVotes}`}
                  match={predictionMatch}
                  canWrite={canWrite}
                  alternativeMatches={predictionCandidates}
                  onSelectMatch={(matchId) => {
                    setSelectedId(matchId);
                    setSelectionSource("prediction-nav");
                  }}
                  onSubmit={async (selectedTeam) => {
                    const error = await postJson(`/api/matches/${predictionMatch.id}/prediction`, { selectedTeam });
                    if (!error) {
                      refreshData();
                    }
                    return error;
                  }}
                />
              </>
            ) : null}

            {activeTab === "ratings" ? (
              <>
                <MatchHero match={activeMatch} />
                <RatingsSection
                  key={`ratings-${activeMatch.id}-${activeMatch.totalRatings}`}
                  match={activeMatch}
                  canWrite={canWrite}
                  onSubmit={async (payload) => {
                    const error = await postJson(`/api/matches/${activeMatch.id}/ratings`, payload);
                    if (!error) {
                      refreshData();
                    }
                    return error;
                  }}
                />
                <CommentsSection
                  key={`ratings-comments-${activeMatch.id}-${activeMatch.comments}`}
                  match={activeMatch}
                  canWrite={canWrite}
                  onSubmit={async (text) => {
                    const error = await postJson(`/api/matches/${activeMatch.id}/comments`, { text });
                    if (!error) {
                      refreshData();
                    }
                    return error;
                  }}
                />
              </>
            ) : null}
          </div>

          <SidePanel profile={initialData.userProfile} />
        </div>
      </main>
    </div>
  );
}
