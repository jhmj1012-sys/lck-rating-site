'use client';

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type {
  MatchComment,
  MatchData,
  MatchDetailData,
  MatchDetailViewStatus,
  MatchSetSummary,
  MatchSummaryItem,
  PlayerRating,
} from "./types";
import { getTeamDisplayName } from "./team-branding";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, Progress, SectionTitle } from "./ui";
import {
  cn,
  getInitials,
  getMatchDetailViewStatus,
  getPredictionBlockReason,
  getPredictionLeader,
  getPredictionSectionMode,
  getRatingAvailability,
  ratingTone,
} from "./utils";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDeadlineText(value: string | null) {
  if (!value) {
    return "마감 정보 없음";
  }

  return `${formatDateTime(value)} 마감`;
}

function formatRemainingLabel(target: string, nowMs: number) {
  const remainingMs = Math.max(0, new Date(target).getTime() - nowMs);
  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}일 ${hours}시간 남음`;
  }

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`;
  }

  return `${Math.max(1, totalMinutes)}분 남음`;
}

function buildScoreLabel(match: MatchData) {
  if (match.score === "-") {
    return "VS";
  }

  return match.score.replace(" : ", " - ");
}

type MatchTeamSlot = "teamA" | "teamB";

function getMatchTeamSlots(match: Pick<MatchData, "teamA" | "teamB">) {
  return [
    { slot: "teamA" as const, code: match.teamA },
    { slot: "teamB" as const, code: match.teamB },
  ];
}

function getSelectedTeamSlot(match: Pick<MatchData, "teamA" | "teamB" | "myPredictionTeam">): MatchTeamSlot | null {
  if (match.myPredictionTeam === match.teamA) {
    return "teamA";
  }

  if (match.myPredictionTeam === match.teamB) {
    return "teamB";
  }

  return null;
}

function getWinnerTeam(match: MatchData) {
  if (match.status !== "finished" || match.score === "-") {
    return null;
  }

  const [scoreA, scoreB] = match.score.split(" : ").map((value) => Number(value));
  if (Number.isNaN(scoreA) || Number.isNaN(scoreB) || scoreA === scoreB) {
    return null;
  }

  return scoreA > scoreB ? match.teamA : match.teamB;
}

function getStatusMeta(status: MatchDetailViewStatus) {
  if (status === "PRE") {
    return {
      label: "예정",
      variant: "accent" as const,
      description: "경기 전에는 평점 구조를 먼저 보여주고, 예측은 아래 보조 영역에서 참여하게 설계했습니다.",
    };
  }

  if (status === "LIVE") {
    return {
      label: "진행 중",
      variant: "danger" as const,
      description: "경기 중에는 진행 상황을 중심으로 보고, 평점은 종료 후 열리도록 잠금 상태를 유지합니다.",
    };
  }

  return {
    label: "종료",
    variant: "success" as const,
    description: "경기 후에는 세트 흐름을 확인하고 바로 평점에 참여할 수 있도록 구성했습니다.",
  };
}

function getCurrentSetLabel(sets: MatchSetSummary[]) {
  const upcomingSet = sets.find((set) => !set.isPlayed);
  if (upcomingSet) {
    return `SET ${upcomingSet.setNumber}`;
  }

  const lastPlayedSet = sets.filter((set) => set.isPlayed).at(-1);
  return lastPlayedSet ? `SET ${lastPlayedSet.setNumber}` : "-";
}

function getSummaryItems(match: MatchData, sets: MatchSetSummary[], status: MatchDetailViewStatus): MatchSummaryItem[] {
  const playedSets = sets.filter((set) => set.isPlayed).length;
  const winnerTeam = getWinnerTeam(match);

  return [
    {
      id: "sets",
      label: "세트 진행",
      value: sets.length > 0 ? `${playedSets} / ${sets.length}` : "정보 없음",
      tone: "default",
    },
    {
      id: "rating",
      label: "평점 평균",
      value:
        status === "POST"
          ? match.averagePlayerRating !== null
            ? match.averagePlayerRating.toFixed(1)
            : "집계 중"
          : "종료 후 오픈",
      tone: match.averagePlayerRating !== null ? "accent" : "default",
    },
    {
      id: "comments",
      label: "댓글",
      value: `${match.comments.toLocaleString()}개`,
      tone: "default",
    },
    {
      id: "highlight",
      label: status === "POST" ? "승리팀" : status === "LIVE" ? "현재 세트" : "시작 시각",
      value: status === "POST" ? winnerTeam ?? "-" : status === "LIVE" ? getCurrentSetLabel(sets) : formatDateTime(match.scheduledAt),
      tone: status === "POST" ? "success" : "default",
    },
  ];
}

function getDefaultPlayerScore(player: PlayerRating | null) {
  if (!player) {
    return 7;
  }

  if (player.viewerScore !== null) {
    return player.viewerScore;
  }

  if (player.ratingCount > 0 && player.rating > 0) {
    return Math.round(player.rating * 2) / 2;
  }

  return 7;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }
}

function MatchHeader({ match, sets, status }: { match: MatchData; sets: MatchSetSummary[]; status: MatchDetailViewStatus }) {
  const statusMeta = getStatusMeta(status);
  const winnerTeam = getWinnerTeam(match);
  const playedSets = sets.filter((set) => set.isPlayed).length;

  return (
    <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)]">
      <CardHeader className="pb-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">{match.league}</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
              {getTeamDisplayName(match.teamA)} vs {getTeamDisplayName(match.teamB)}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              <span>{match.stage}</span>
              <span>{formatDateTime(match.scheduledAt)}</span>
              <span>패치 {match.patch}</span>
              {winnerTeam ? <Badge variant="success">{getTeamDisplayName(winnerTeam)} 승리</Badge> : null}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{statusMeta.description}</p>
          </div>

          <div className="grid min-w-[250px] grid-cols-2 gap-3 sm:min-w-[320px]">
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-center">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">스코어</div>
              <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{buildScoreLabel(match)}</div>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-center">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">완료 세트</div>
              <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{playedSets}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">평점 참여</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{match.totalRatings.toLocaleString()}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">댓글</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{match.comments.toLocaleString()}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">예측 참여</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{match.predictionSummary.totalVotes.toLocaleString()}</div>
          </div>
          <div className={cn("rounded-[22px] border px-4 py-4", winnerTeam ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{status === "POST" ? "매치 MVP" : "상태"}</div>
            <div className={cn("mt-2 text-2xl font-black", winnerTeam ? "text-emerald-700" : "text-slate-950")}>
              {status === "POST" ? match.mvp : statusMeta.label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchSummarySection({ match, sets, status }: { match: MatchData; sets: MatchSetSummary[]; status: MatchDetailViewStatus }) {
  const summaryItems = getSummaryItems(match, sets, status);

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          eyebrow="Summary"
          title="경기와 세트 요약"
          description="세트 흐름, 평점 현황, 댓글 반응을 먼저 파악한 뒤 바로 평점 영역으로 이어지도록 정리했습니다."
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 md:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-[22px] border px-4 py-4",
                item.tone === "accent"
                  ? "border-sky-200 bg-sky-50"
                  : item.tone === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white",
              )}
            >
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-black text-slate-950">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-950">세트 흐름</div>
            <div className="text-sm text-slate-500">POST에서는 각 세트에서 바로 평점 페이지로 이동할 수 있습니다.</div>
          </div>

          {sets.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              아직 등록된 세트 정보가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {sets.map((set) => {
                const href = set.isPlayed ? `/matches/${match.id}/sets/${set.setNumber}` : null;
                const actionLabel = !set.isPlayed
                  ? "대기 중"
                  : status === "POST"
                    ? "세트 평점으로 이동"
                    : status === "LIVE"
                      ? "세트 결과 보기"
                      : "경기 후 열림";
                const content = (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-slate-950">SET {set.setNumber}</div>
                        <div className="mt-1 text-sm text-slate-500">{set.durationLabel}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {set.viewerHasRated ? <Badge variant="success">내 평점 완료</Badge> : null}
                        <Badge variant={set.isPlayed ? "outline" : "neutral"}>{actionLabel}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                      <div>
                        <div className="font-semibold text-slate-950">
                          {set.winnerTeam ? `${getTeamDisplayName(set.winnerTeam)} 승리` : "아직 진행되지 않은 세트"}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{set.note || "세트 메모가 아직 없습니다."}</div>
                      </div>
                      <div className="text-sm text-slate-600 sm:text-right">
                        <div>스코어 {set.scoreLabel}</div>
                        <div className="mt-1">평점 참여 {set.ratingParticipants.toLocaleString()}건</div>
                        <div className="mt-1">주요 선수 {set.topPerformer ?? "-"}</div>
                      </div>
                    </div>
                  </>
                );

                if (!href) {
                  return (
                    <div key={set.id} className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-slate-500">
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={set.id}
                    href={href}
                    className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 transition hover:bg-slate-50"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RatingLockedState({
  match,
  sets,
  status,
}: {
  match: MatchData;
  sets: MatchSetSummary[];
  status: MatchDetailViewStatus;
}) {
  const playedSets = sets.filter((set) => set.isPlayed).length;
  const currentSetLabel = getCurrentSetLabel(sets);
  const title = status === "PRE" ? "경기 종료 후 평점 참여가 열립니다." : "경기 종료 후 평점이 오픈됩니다.";
  const description =
    status === "PRE"
      ? "지금은 경기 흐름과 세트 구조를 먼저 확인하는 단계입니다. 종료 후에는 세트별 평점과 경기 전체 선수 평점이 차례로 열립니다."
      : "현재는 경기 진행 상황을 보는 구간입니다. 경기가 끝나면 세트별 평점이 가장 먼저 열리고, 그 아래에서 경기 전체 선수 평점을 남길 수 있습니다.";

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Rating Locked</div>
            <div className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">{title}</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          </div>
          <div className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            경기 종료 후 평점 오픈
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">세트 진행</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{playedSets}</div>
          <div className="mt-1 text-sm text-slate-600">완료된 세트 수</div>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">현재 세트</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{currentSetLabel}</div>
          <div className="mt-1 text-sm text-slate-600">{status === "LIVE" ? "실시간 흐름 확인" : "경기 시작 전"}</div>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">오픈 방식</div>
          <div className="mt-2 text-2xl font-black text-slate-950">세트 우선</div>
          <div className="mt-1 text-sm text-slate-600">세트별 평점이 먼저, 경기 전체 평점이 다음에 이어집니다.</div>
        </div>
      </div>

      {status === "LIVE" ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-800">
          예측은 이미 마감되었고, 지금은 경기 진행 상황을 확인하는 구간입니다. 평점은 종료 직후 바로 열립니다.
        </div>
      ) : (
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
          경기 전에는 예측이 보조 행동이고, 메인 공간은 평점 구조를 미리 안내하는 자리로 유지합니다.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
          세트 결과가 생기면 요약 구역과 평점 구역에서 바로 흐름을 볼 수 있고, 경기 종료 후 각 세트 카드에서 평점 페이지로 이동할 수 있습니다.
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
          현재 누적 평점 참여는 {match.totalRatings.toLocaleString()}건, 댓글은 {match.comments.toLocaleString()}개입니다. 경기가 끝난 뒤 이 데이터가 평점 축적으로 이어집니다.
        </div>
      </div>
    </div>
  );
}

function SetResultList({ matchId, sets }: { matchId: string; sets: MatchSetSummary[] }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">세트별 평점 진입</div>
          <div className="mt-1 text-sm text-slate-500">경기 종료 후에는 세트별 결과를 본 뒤 바로 평점을 남길 수 있습니다.</div>
        </div>
        <Badge variant="accent">세트별 평점이 메인</Badge>
      </div>

      {sets.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          아직 등록된 세트 정보가 없습니다.
        </div>
      ) : (
        sets.map((set) => (
          <Link
            key={set.id}
            href={set.isPlayed ? `/matches/${matchId}/sets/${set.setNumber}` : "#"}
            aria-disabled={!set.isPlayed}
            className={cn(
              "block rounded-[24px] border px-4 py-4 transition",
              set.isPlayed ? "border-slate-200 bg-white hover:bg-slate-50" : "pointer-events-none border-dashed border-slate-200 bg-slate-50 text-slate-500",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black text-slate-950">SET {set.setNumber}</div>
                <div className="mt-1 text-sm text-slate-500">{set.durationLabel}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {set.viewerHasRated ? <Badge variant="success">내 평점 완료</Badge> : null}
                <Badge variant={set.isPlayed ? "accent" : "neutral"}>{set.isPlayed ? "평점 보기/남기기" : "대기 중"}</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
              <div>
                <div className="font-semibold text-slate-950">
                  {set.winnerTeam ? `${getTeamDisplayName(set.winnerTeam)} 승리` : "세트 결과 대기"}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{set.note || "세트 메모가 아직 없습니다."}</div>
              </div>
              <div className="text-sm text-slate-600 md:text-right">
                <div>스코어 {set.scoreLabel}</div>
                <div className="mt-1">평점 참여 {set.ratingParticipants.toLocaleString()}건</div>
                <div className="mt-1">주요 선수 {set.topPerformer ?? "-"}</div>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

function OverallPlayerRatingPanel({ match }: { match: MatchData }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedPlayerId, setSelectedPlayerId] = useState(match.players[0]?.id ?? "");
  const [score, setScore] = useState(getDefaultPlayerScore(match.players[0] ?? null));
  const [comment, setComment] = useState(match.players[0]?.viewerComment ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selectedPlayer = match.players.find((player) => player.id === selectedPlayerId) ?? match.players[0] ?? null;
  const canWrite = status === "authenticated" && Boolean(session?.user?.hasNickname);

  useEffect(() => {
    if (!selectedPlayer && match.players[0]) {
      setSelectedPlayerId(match.players[0].id);
    }
  }, [match.players, selectedPlayer]);

  useEffect(() => {
    setScore(getDefaultPlayerScore(selectedPlayer));
    setComment(selectedPlayer?.viewerComment ?? "");
    setFeedback(null);
  }, [selectedPlayer?.id, selectedPlayer?.viewerScore, selectedPlayer?.viewerComment]);

  const helperMessage =
    status !== "authenticated"
      ? "로그인 후 경기 전체 선수 평점을 남길 수 있습니다."
      : !session?.user?.hasNickname
        ? "닉네임 설정 후 경기 전체 선수 평점에 참여할 수 있습니다."
        : selectedPlayer?.viewerScore !== null
          ? `이미 ${selectedPlayer.viewerScore.toFixed(1)}점을 남긴 선수입니다. 수정 저장하면 최신 점수로 반영됩니다.`
          : "세트 평점을 먼저 남긴 뒤, 경기 전체 인상은 여기서 보조로 남길 수 있습니다.";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">경기 전체 선수 평점</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">
            세트별 평점 아래에서 경기 전체 인상을 한 번 더 남길 수 있습니다. 현재 내 경기 평점 저장 수는 {match.viewerPlayerRatingCount}건입니다.
          </div>
        </div>
        <Badge variant="outline">보조 평점</Badge>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
        {helperMessage}
      </div>

      {match.players.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
          출전 선수 정보가 없어 경기 전체 평점을 표시할 수 없습니다.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {getMatchTeamSlots(match).map(({ slot, code }) => (
              <div key={slot} className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-base font-bold text-slate-950">{getTeamDisplayName(code)}</div>
                  <Badge variant="outline">{code}</Badge>
                </div>
                <div className="space-y-3">
                  {match.players
                    .filter((player) => player.team === code)
                    .map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => setSelectedPlayerId(player.id)}
                        className={cn(
                          "w-full rounded-[20px] border px-4 py-3 text-left transition",
                          selectedPlayerId === player.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50 hover:bg-white",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-slate-950">{player.name}</span>
                              <Badge variant="outline">{player.role}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              평균 {player.ratingCount > 0 ? player.rating.toFixed(1) : "-"} · 참여 {player.ratingCount}명
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn("rounded-2xl border px-3 py-2 text-sm font-bold", ratingTone(player.rating || 0))}>
                              {player.ratingCount > 0 ? player.rating.toFixed(1) : "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {player.viewerScore !== null ? `내 평점 ${player.viewerScore.toFixed(1)}` : "미참여"}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {selectedPlayer ? (
            <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-slate-950">{selectedPlayer.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {getTeamDisplayName(selectedPlayer.team)} · {selectedPlayer.role} · 평균{" "}
                    {selectedPlayer.ratingCount > 0 ? selectedPlayer.rating.toFixed(1) : "-"}
                  </div>
                </div>
                <div className={cn("rounded-2xl border px-3 py-2 text-sm font-bold", ratingTone(score))}>{score.toFixed(1)}</div>
              </div>

              <div className="mt-4 space-y-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={score}
                  onChange={(event) => setScore(Number(event.target.value))}
                  disabled={!canWrite || pending}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Progress value={(selectedPlayer.ratingCount > 0 ? selectedPlayer.rating : score) * 10} className="h-2" />
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  placeholder="경기 전체 기준으로 느낀 선수 인상을 짧게 남겨도 됩니다."
                  disabled={!canWrite || pending}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
                {feedback ? <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{feedback}</div> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-500">저장하면 경기 전체 평점 데이터와 내 참여 이력이 함께 갱신됩니다.</div>
                  <Button
                    className="min-w-40"
                    disabled={!canWrite || pending || !selectedPlayer}
                    onClick={async () => {
                      if (!selectedPlayer) {
                        return;
                      }

                      try {
                        setPending(true);
                        await postJson(`/api/matches/${match.id}/ratings`, {
                          playerId: selectedPlayer.id,
                          score,
                          comment,
                        });
                        setFeedback("경기 전체 선수 평점을 저장했습니다.");
                        startTransition(() => router.refresh());
                      } catch (error) {
                        setFeedback(error instanceof Error ? error.message : "평점 저장에 실패했습니다.");
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    {!canWrite ? "평점 작성 불가" : pending ? "저장 중..." : "경기 평점 저장"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function RatingSection({ match, sets, status }: { match: MatchData; sets: MatchSetSummary[]; status: MatchDetailViewStatus }) {
  const availability = getRatingAvailability(status);

  return (
    <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <CardHeader>
        <SectionTitle
          eyebrow="Rating"
          title="평점 참여"
          description="이 페이지의 중심은 예측이 아니라 평점입니다. 경기 흐름을 확인한 뒤 세트별 평가와 선수 평점으로 자연스럽게 이어지도록 구성했습니다."
        />
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        {availability === "locked" ? <RatingLockedState match={match} sets={sets} status={status} /> : null}
        {availability === "open" ? (
          <>
            <div className="rounded-[28px] border border-sky-200 bg-sky-50 px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Rating Open</div>
                  <div className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">세트별 평점이 메인이고, 경기 전체 평점이 그 아래에서 이어집니다.</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    먼저 세트 흐름을 보면서 세트별 평점을 남기고, 필요한 경우 경기 전체 기준의 선수 평점을 추가로 남길 수 있습니다.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-sky-200 bg-white px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-sky-700">평점 평균</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">
                      {match.averagePlayerRating !== null ? match.averagePlayerRating.toFixed(1) : "집계 중"}
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-sky-200 bg-white px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-sky-700">내 경기 평점</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{match.viewerPlayerRatingCount}건</div>
                  </div>
                </div>
              </div>
            </div>

            <SetResultList matchId={match.id} sets={sets} />
            <OverallPlayerRatingPanel match={match} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PredictionDistributionBars({ match, locked = false }: { match: MatchData; locked?: boolean }) {
  const summary = locked && match.lockedDistribution ? match.lockedDistribution : match.predictionSummary;
  const teamSlots = getMatchTeamSlots(match);

  return (
    <div className="space-y-3">
      {teamSlots.map(({ slot, code }) => (
        <div key={slot} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-950">{getTeamDisplayName(code)}</div>
            <div className="text-sm font-bold text-slate-700">{summary[slot]}%</div>
          </div>
          <Progress value={summary[slot]} className="mt-3 h-2.5" />
        </div>
      ))}
    </div>
  );
}

function PredictionEntryPanel({ match }: { match: MatchData }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedSlot, setSelectedSlot] = useState<MatchTeamSlot | null>(() => getSelectedTeamSlot(match));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => new Date(match.serverNow).getTime());

  useEffect(() => {
    setSelectedSlot(getSelectedTeamSlot(match));
  }, [match.id, match.myPredictionTeam, match.teamA, match.teamB]);

  useEffect(() => {
    if (!match.predictionDeadlineAt || match.predictionLocked) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [match.predictionDeadlineAt, match.predictionLocked]);

  const canWrite = status === "authenticated";
  const hasNickname = Boolean(session?.user?.hasNickname);
  const deadlineMs = match.predictionDeadlineAt ? new Date(match.predictionDeadlineAt).getTime() : null;
  const predictionLockedNow = match.predictionLocked || (deadlineMs !== null && deadlineMs <= now);
  const teamSlots = getMatchTeamSlots(match);
  const selectedTeam = selectedSlot ? match[selectedSlot] : "";
  const blockReason = getPredictionBlockReason({ ...match, predictionLocked: predictionLockedNow }, canWrite, selectedTeam, hasNickname);
  const countdownLabel = match.predictionDeadlineAt ? formatRemainingLabel(match.predictionDeadlineAt, now) : "마감 정보 없음";

  const helperText =
    blockReason === "unauthenticated"
      ? "로그인 후 예측에 참여할 수 있습니다."
      : blockReason === "profile-required"
        ? "닉네임 설정 후 예측에 참여할 수 있습니다."
        : blockReason === "unavailable"
          ? "대진이 확정되면 예측이 열립니다."
          : blockReason === "locked"
            ? "예측이 마감되었습니다. 이제는 결과와 평점 흐름을 중심으로 보면 됩니다."
        : blockReason === "needs-selection"
          ? "먼저 승리 팀을 선택해 주세요."
          : match.myPredictionTeam
            ? `현재 내 선택은 ${getTeamDisplayName(match.myPredictionTeam)}입니다. 마감 전까지는 변경할 수 있습니다.`
            : `현재 우세 선택은 ${getPredictionLeader(match.predictionSummary, match)}입니다.`;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_320px]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {teamSlots.map(({ slot, code }) => {
            return (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setSelectedSlot(slot);
                  setFeedback(null);
                }}
                className={cn(
                  "rounded-[24px] border p-5 text-left transition",
                  selectedSlot === slot ? "border-sky-300 bg-sky-50 shadow-[0_14px_36px_rgba(14,165,233,0.12)]" : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">승부 예측</div>
              <div className="mt-2 text-2xl font-black text-slate-950">{getTeamDisplayName(code)}</div>
              <div className="mt-3 text-sm text-slate-500">현재 비율 {match.predictionSummary[slot]}%</div>
              </button>
            );
          })}
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">{helperText}</div>
        {feedback ? <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">{feedback}</div> : null}

        <Button
          className="w-full"
          disabled={pending || blockReason !== null}
          onClick={async () => {
            try {
              setPending(true);
              await postJson(`/api/matches/${match.id}/prediction`, { selectedTeam });
              setFeedback("예측을 저장했습니다.");
              startTransition(() => router.refresh());
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "예측 저장에 실패했습니다.");
            } finally {
              setPending(false);
            }
          }}
        >
          {blockReason === "unauthenticated"
            ? "로그인 후 예측 참여"
            : blockReason === "profile-required"
              ? "닉네임 설정 필요"
              : blockReason === "unavailable"
                ? "대진 확정 대기"
                : blockReason === "locked"
                  ? "예측 마감"
                  : pending
                    ? "저장 중..."
                    : match.myPredictionTeam
                      ? "예측 변경 저장"
                      : "선택한 팀으로 예측하기"}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[22px] border border-amber-100 bg-amber-50 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-700">마감까지</div>
            <div className="mt-2 text-xl font-black text-slate-950">{predictionLockedNow ? "마감됨" : countdownLabel}</div>
            <div className="mt-1 text-sm text-slate-600">{formatDeadlineText(match.predictionDeadlineAt)}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">참여자 수</div>
            <div className="mt-2 text-xl font-black text-slate-950">{match.predictionSummary.totalVotes.toLocaleString()}</div>
            <div className="mt-1 text-sm text-slate-600">평점 아래의 보조 참여 지표</div>
          </div>
        </div>
        <PredictionDistributionBars match={match} />
      </div>
    </div>
  );
}

function PredictionLockedPanel({ match }: { match: MatchData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-800">
        예측은 이미 마감되었습니다. 지금은 경기 진행 상황을 보면서 마감 당시 분포와 내 선택을 참고 정보로만 확인할 수 있습니다.
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">내 선택</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{match.myPredictionTeam ? getTeamDisplayName(match.myPredictionTeam) : "미참여"}</div>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">마감 표본</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{match.lockedDistribution?.totalVotes ?? match.predictionSummary.totalVotes}</div>
          <div className="mt-1 text-sm text-slate-600">마감 시점 참여 수</div>
        </div>
        <div className="rounded-[22px] border border-sky-100 bg-sky-50 px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-sky-700">확정 보너스</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {match.lockedOdds ? `${match.lockedOdds.teamA.hitBonusCoins} / ${match.lockedOdds.teamB.hitBonusCoins}` : "-"}
          </div>
          <div className="mt-1 text-sm text-slate-600">팀별 적중 시 추가 Coin</div>
        </div>
      </div>

      <PredictionDistributionBars match={match} locked />
    </div>
  );
}

function MyPredictionResultCard({ match }: { match: MatchData }) {
  const isHit = match.myPredictionSettlementResult === "hit";
  const resultLabel =
    match.myPredictionSettlementResult === "hit"
      ? "적중"
      : match.myPredictionSettlementResult === "miss"
        ? "미적중"
        : match.myPredictionTeam
          ? "정산 대기"
          : "미참여";

  return (
    <div className={cn("rounded-[24px] border px-4 py-4", isHit ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">내 선택</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{match.myPredictionTeam ? getTeamDisplayName(match.myPredictionTeam) : "미참여"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">결과</div>
          <div className={cn("mt-2 text-2xl font-black", isHit ? "text-emerald-700" : "text-slate-950")}>{resultLabel}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">획득 Coin</div>
          <div className="mt-2 text-2xl font-black text-slate-950">+{match.myPredictionSettlementCoins}</div>
        </div>
      </div>
    </div>
  );
}

function PredictionResultPanel({ match }: { match: MatchData }) {
  return (
    <div className="space-y-4">
      <MyPredictionResultCard match={match} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Locked Distribution</div>
          <div className="mt-2 font-semibold text-slate-950">
            {match.teamA} {match.lockedDistribution?.teamA ?? match.predictionSummary.teamA}% · {match.teamB} {match.lockedDistribution?.teamB ?? match.predictionSummary.teamB}%
          </div>
          <div className="mt-1 text-slate-600">예측 마감 후 확정된 참여 분포입니다.</div>
        </div>
        <div className="rounded-[22px] border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-slate-700">
          <div className="text-xs uppercase tracking-[0.18em] text-sky-700">Locked Rewards</div>
          <div className="mt-2 font-semibold text-slate-950">
            {match.lockedOdds
              ? `${match.teamA} +${match.lockedOdds.teamA.hitBonusCoins} Coin · ${match.teamB} +${match.lockedOdds.teamB.hitBonusCoins} Coin`
              : "확정 보상 정보 없음"}
          </div>
          <div className="mt-1 text-slate-600">
            {match.lockedOdds
              ? `확정 배당 ${match.lockedOdds.teamA.oddsPercent}% / ${match.lockedOdds.teamB.oddsPercent}%`
              : "정산 데이터 대기"}
          </div>
        </div>
      </div>

      <PredictionDistributionBars match={match} locked />
    </div>
  );
}

function PredictionSection({ match, status }: { match: MatchData; status: MatchDetailViewStatus }) {
  const mode = getPredictionSectionMode(status);

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          eyebrow="Prediction"
          title="예측"
          description="예측은 유지하지만, 이제는 평점 아래에서 참고하거나 참여하는 보조 기능으로 배치합니다."
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {mode === "entry" ? <PredictionEntryPanel match={match} /> : null}
        {mode === "locked" ? <PredictionLockedPanel match={match} /> : null}
        {mode === "result" ? <PredictionResultPanel match={match} /> : null}
      </CardContent>
    </Card>
  );
}

function CommentComposer({ match }: { match: MatchData }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [commentText, setCommentText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canWrite = status === "authenticated" && Boolean(session?.user?.hasNickname);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <textarea
        value={commentText}
        onChange={(event) => setCommentText(event.target.value)}
        rows={4}
        placeholder={
          status !== "authenticated"
            ? "댓글은 로그인 후 작성할 수 있습니다."
            : !session?.user?.hasNickname
              ? "닉네임을 먼저 설정하면 댓글을 작성할 수 있습니다."
              : "경기 흐름이나 평점 포인트를 짧게 남겨보세요."
        }
        className="w-full rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canWrite || pending}
      />
      {feedback ? <div className="mt-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{feedback}</div> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">댓글은 경기 평점과 함께 팬 반응 데이터를 쌓는 보조 축입니다.</div>
        <Button
          disabled={!canWrite || pending || commentText.trim().length < 2}
          onClick={async () => {
            try {
              setPending(true);
              await postJson(`/api/matches/${match.id}/comments`, { text: commentText });
              setCommentText("");
              setFeedback("댓글을 등록했습니다.");
              startTransition(() => router.refresh());
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "댓글 등록에 실패했습니다.");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "등록 중..." : "댓글 등록"}
        </Button>
      </div>
    </div>
  );
}

function CommentList({ comments }: { comments: MatchComment[] }) {
  if (comments.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        아직 댓글이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 text-xs font-bold text-slate-800">{getInitials(comment.user)}</Avatar>
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-950">{comment.user}</div>
              <div className="text-xs text-slate-500">{comment.createdLabel}</div>
            </div>
            <div className="ml-auto">
              <Badge variant="outline">{comment.tag}</Badge>
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-700">{comment.text}</p>
        </div>
      ))}
    </div>
  );
}

function MatchCommunitySection({ match }: { match: MatchData }) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle
          eyebrow="Community"
          title="댓글과 반응"
          description="평점과 예측 아래에서 경기 반응을 이어갈 수 있는 보조 커뮤니티 구역입니다."
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <CommentComposer match={match} />
        <CommentList comments={match.commentsList} />
      </CardContent>
    </Card>
  );
}

export function MatchDetailStateView({ data }: { data: MatchDetailData }) {
  const status = getMatchDetailViewStatus(data.match);

  return (
    <div className="space-y-6">
      <MatchHeader match={data.match} sets={data.sets} status={status} />
      <MatchSummarySection match={data.match} sets={data.sets} status={status} />
      <RatingSection match={data.match} sets={data.sets} status={status} />
      <PredictionSection match={data.match} status={status} />
      <MatchCommunitySection match={data.match} />
    </div>
  );
}
