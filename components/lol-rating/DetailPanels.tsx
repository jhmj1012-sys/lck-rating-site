'use client';

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { PublicUserTrigger } from "./PublicUserTrigger";
import type { MatchComment, MatchData, MatchSetSummary, PlayerRole, SetDetailData, SetPlayerRating } from "./types";
import { getTeamDisplayName } from "./team-branding";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, Progress, SectionTitle } from "./ui";
import { cn, getInitials, getPredictionBlockReason, getPredictionLeader, ratingTone } from "./utils";

const roleLabels: Record<PlayerRole, string> = {
  TOP: "TOP",
  JGL: "JGL",
  MID: "MID",
  ADC: "ADC",
  SUP: "SUP",
};

function formatPredictionDeadline(value: string) {
  const target = new Date(value);
  const now = new Date();
  const sameYear = target.getFullYear() === now.getFullYear();
  const sameMonth = target.getMonth() === now.getMonth();
  const sameDate = target.getDate() === now.getDate();

  if (sameYear && sameMonth && sameDate) {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(target);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(target);
}

function formatRemainingLabel(remainingMs: number) {
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

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    return payload.error ?? "요청을 처리하지 못했습니다.";
  }

  return null;
}

export function MatchOverviewPanel({ match, sets }: { match: MatchData; sets: MatchSetSummary[] }) {
  return (
    <Card className="overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)]">
      <CardHeader>
        <SectionTitle
          eyebrow={match.league}
          title={`${getTeamDisplayName(match.teamA)} vs ${getTeamDisplayName(match.teamB)}`}
          description={`${match.stage} · ${match.date} · 패치 ${match.patch}`}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4">
            <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Blue</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{getTeamDisplayName(match.teamA)}</div>
          </div>
          <div className="text-center text-5xl font-black tracking-tight text-slate-950">{match.score}</div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-left lg:text-right">
            <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Red</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{getTeamDisplayName(match.teamB)}</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">세트 수 {sets.length}</div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">세트 평점 {match.totalRatings.toLocaleString()}</div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">댓글 {match.comments.toLocaleString()}</div>
        </div>

        {match.lockedOdds && match.lockedDistribution ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Locked Distribution</div>
              <div className="mt-2 font-semibold text-slate-950">{match.teamA} {match.lockedDistribution.teamA}% · {match.teamB} {match.lockedDistribution.teamB}%</div>
              <div className="mt-1 text-slate-600">마감 시점 참여 {match.lockedDistribution.totalVotes}건 기준</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Locked Odds</div>
              <div className="mt-2 font-semibold text-slate-950">{match.teamA} {match.lockedOdds.teamA.oddsPercent}% · {match.teamB} {match.lockedOdds.teamB.oddsPercent}%</div>
              <div className="mt-1 text-slate-600">적중 시 추가 {match.lockedOdds.teamA.hitBonusCoins} / {match.lockedOdds.teamB.hitBonusCoins} Coin</div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function MatchSetLinks({ matchId, sets }: { matchId: string; sets: MatchSetSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle
          eyebrow="Sets"
          title="세트별 결과와 평점"
          description="경기 결과에서 바로 세트별 선수 평점 페이지로 들어갈 수 있게 구성했습니다."
        />
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {sets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            아직 등록된 세트 정보가 없습니다.
          </div>
        ) : (
          sets.map((set) => (
            set.isPlayed ? (
              <Link
                key={set.id}
                href={`/matches/${matchId}/sets/${set.setNumber}`}
                className="grid gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[96px_minmax(0,1fr)_140px_120px]"
              >
                <div>
                  <div className="text-lg font-black text-slate-950">SET {set.setNumber}</div>
                  <div className="text-sm text-slate-500">{set.durationLabel}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-950">{set.winnerTeam ? `${getTeamDisplayName(set.winnerTeam)} 승리` : "결과 미정"}</div>
                  <div className="mt-1 text-sm text-slate-600">{set.note || "세트 메모 없음"}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>스코어 {set.scoreLabel}</div>
                  <div className="mt-1">평점 {set.ratingParticipants.toLocaleString()}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>TOP</div>
                  <div className="mt-1 font-semibold text-slate-950">{set.topPerformer ?? "-"}</div>
                </div>
              </Link>
            ) : (
              <div
                key={set.id}
                aria-disabled="true"
                className="grid gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-4 opacity-80 md:grid-cols-[96px_minmax(0,1fr)_140px_120px]"
              >
                <div>
                  <div className="text-lg font-black text-slate-950">SET {set.setNumber}</div>
                  <div className="text-sm text-slate-500">미진행</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-950">미진행 세트</div>
                  <div className="mt-1 text-sm text-slate-600">{set.note || "세트 메모 없음"}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>스코어 {set.scoreLabel}</div>
                  <div className="mt-1">평점 0</div>
                </div>
                <div className="flex items-start justify-start md:justify-end">
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">클릭 불가</span>
                </div>
              </div>
            )
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function MatchEngagementPanel({ match }: { match: MatchData }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedSide, setSelectedSide] = useState(match.myPredictionTeam ?? "");
  const [predictionFeedback, setPredictionFeedback] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);
  const [pendingPrediction, setPendingPrediction] = useState(false);
  const [pendingComment, setPendingComment] = useState(false);
  const [now, setNow] = useState(() => new Date(match.serverNow).getTime());
  const canWrite = status === "authenticated";
  const hasNickname = Boolean(session?.user?.hasNickname);
  const deadlineMs = match.predictionDeadlineAt ? new Date(match.predictionDeadlineAt).getTime() : null;
  const remainingMs = deadlineMs === null ? 0 : Math.max(0, deadlineMs - now);
  const predictionLockedNow = match.predictionLocked || (deadlineMs !== null && deadlineMs <= now);
  const predictionMatch = { ...match, predictionLocked: predictionLockedNow };
  const blockReason = getPredictionBlockReason(predictionMatch, canWrite, selectedSide, hasNickname);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
  const countdownLabel = `${String(remainingMinutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  const shouldShowCountdown = remainingMs <= 10 * 60 * 1000;
  const deadlineText = match.predictionDeadlineAt ? formatPredictionDeadline(match.predictionDeadlineAt) : null;

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  useEffect(() => {
    if (!match.predictionDeadlineAt || predictionLockedNow) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [match.predictionDeadlineAt, predictionLockedNow]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <SectionTitle
            eyebrow="Prediction"
            title="경기 예측"
            description="예측에 참여하면 코인을 얻고, 적중 시 추가 코인을 받을 수 있습니다. 마감 전까지는 팀 선택을 바꿀 수 있습니다."
          />
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Reward</div>
              <div className="mt-2 font-semibold text-slate-950">참여 보상 +10 Coin</div>
              <div className="mt-1 text-slate-600">선택만 완료해도 코인이 쌓입니다.</div>
            </div>
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Bonus</div>
              <div className="mt-2 font-semibold text-slate-950">적중 시 추가 +5 Coin</div>
              <div className="mt-1 text-slate-600">팬 평균과 비교하면서 적중률도 함께 기록됩니다.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm text-slate-700">
              {predictionLockedNow
                ? "예측이 마감되었습니다."
                : shouldShowCountdown
                  ? `예측 마감까지 ${countdownLabel}`
                  : `예측 마감 시각 ${deadlineText}`}
            </div>
            <div className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              predictionLockedNow ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800",
            )}>
              {predictionLockedNow ? "00:00" : shouldShowCountdown ? countdownLabel : formatRemainingLabel(remainingMs)}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[match.teamA, match.teamB].map((team, index) => {
              const selectable = blockReason === null || blockReason === "needs-selection";

              return (
                <button
                  key={`${match.id}-${team}-${index}`}
                  onClick={() => {
                    if (selectable) {
                      setSelectedSide(team);
                      setPredictionFeedback(null);
                    }
                  }}
                  className={cn(
                    "rounded-[24px] border p-5 text-left transition",
                    selectedSide === team ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white",
                    selectable ? "hover:bg-slate-50" : "cursor-not-allowed opacity-70",
                  )}
                  disabled={!selectable}
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">예측 비율</div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-slate-950">{getTeamDisplayName(team)}</div>
                  </div>
                  <div className="mt-3 text-4xl font-black text-slate-950">
                    {index === 0 ? match.predictionSummary.teamA : match.predictionSummary.teamB}%
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {blockReason === "unauthenticated"
              ? "로그인 후 예측에 참여할 수 있습니다."
              : blockReason === "profile-required"
                ? "닉네임을 먼저 설정하면 예측과 댓글에 참여할 수 있습니다."
                : blockReason === "unavailable"
                  ? "아직 대진이 확정되지 않아 예측할 수 없습니다."
                : blockReason === "locked"
                    ? "이 경기는 예측이 마감되었습니다. 종료 후에는 결과와 적중 보상을 확인할 수 있습니다."
                    : blockReason === "needs-selection"
                    ? "먼저 팀을 선택해 주세요. 선택을 완료하면 참여 코인이 즉시 반영됩니다."
                    : match.myPredictionTeam
                      ? `현재 내 선택: ${getTeamDisplayName(match.myPredictionTeam)} · 마감 전까지 변경할 수 있고, 적중 시 추가 코인을 받습니다.`
                      : `현재 대세: ${getPredictionLeader(match.predictionSummary, match)} · 지금 참여하면 +10 Coin`}
          </div>

          {match.lockedOdds && match.lockedDistribution ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Locked Distribution</div>
                <div className="mt-2 font-semibold text-slate-950">{match.teamA} {match.lockedDistribution.teamA}% · {match.teamB} {match.lockedDistribution.teamB}%</div>
                <div className="mt-1 text-slate-600">예측 마감 후 확정된 참여 분포입니다.</div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Locked Rewards</div>
                <div className="mt-2 font-semibold text-slate-950">{match.teamA} +{match.lockedOdds.teamA.hitBonusCoins} Coin · {match.teamB} +{match.lockedOdds.teamB.hitBonusCoins} Coin</div>
                <div className="mt-1 text-slate-600">확정 배당 {match.lockedOdds.teamA.oddsPercent}% / {match.lockedOdds.teamB.oddsPercent}%</div>
              </div>
            </div>
          ) : null}

          {match.myPredictionSettlementResult ? (
            <div className={cn(
              "rounded-2xl px-4 py-3 text-sm",
              match.myPredictionSettlementResult === "hit" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-slate-200 bg-slate-50 text-slate-700",
            )}>
              {match.myPredictionSettlementResult === "hit"
                ? `정산 완료: 적중으로 +${match.myPredictionSettlementCoins} Coin이 지급되었습니다.`
                : "정산 완료: 선택 결과가 빗나갔고, 참여 코인은 유지됩니다."}
            </div>
          ) : null}

          {predictionFeedback ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{predictionFeedback}</div> : null}

          <Button
            className="w-full"
            disabled={pendingPrediction || blockReason !== null}
            onClick={async () => {
              setPendingPrediction(true);
              const error = await postJson(`/api/matches/${match.id}/prediction`, { selectedTeam: selectedSide });
              setPredictionFeedback(error ?? "예측을 등록했습니다. 참여 코인이 반영되었습니다.");
              setPendingPrediction(false);
              if (!error) {
                refresh();
              }
            }}
          >
            {blockReason === "locked"
              ? "예측 마감"
              : blockReason === "unavailable"
                ? "대진 확정 대기"
              : blockReason === "unauthenticated"
                  ? "로그인 후 예측 참여"
                  : blockReason === "profile-required"
                    ? "닉네임 설정 필요"
                  : pendingPrediction
                    ? "등록 중..."
                    : match.myPredictionTeam
                      ? "예측 변경 저장"
                      : "선택한 팀으로 예측하기"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle eyebrow="Comments" title="경기 반응" description="댓글은 경기 단위로 남길 수 있습니다." />
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            rows={4}
            placeholder={
              !canWrite
                ? "댓글은 로그인 후 작성할 수 있습니다."
                : !hasNickname
                ? "닉네임을 먼저 설정하면 댓글을 작성할 수 있습니다."
                  : "경기 인상이나 분석 메모를 남겨보세요."
            }
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none"
            disabled={!canWrite || !hasNickname || pendingComment}
          />
          {commentFeedback ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{commentFeedback}</div> : null}
          <Button
            disabled={!canWrite || !hasNickname || pendingComment || commentText.trim().length < 2}
            onClick={async () => {
              setPendingComment(true);
              const error = await postJson(`/api/matches/${match.id}/comments`, { text: commentText });
              setCommentFeedback(error ?? "댓글을 등록했습니다.");
              setPendingComment(false);
              if (!error) {
                setCommentText("");
                refresh();
              }
            }}
          >
            {pendingComment ? "등록 중..." : "댓글 등록"}
          </Button>

          <div className="space-y-3">
            {match.commentsList.map((comment: MatchComment) => (
              <div key={comment.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 text-xs font-bold text-slate-800">{getInitials(comment.user)}</Avatar>
                  <div>
                    <PublicUserTrigger
                      summary={comment.userSummary}
                      label={comment.user}
                      className="font-semibold text-slate-950"
                    />
                    <div className="text-xs text-slate-500">{comment.createdLabel}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{comment.text}</p>
              </div>
            ))}
            {match.commentsList.length === 0 ? <div className="text-sm text-slate-500">아직 댓글이 없습니다.</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlayerRatingCard({
  player,
  value,
  disabled,
  onChange,
  mirror = false,
}: {
  player: SetPlayerRating;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  mirror?: boolean;
}) {
  return (
    <div className={cn("rounded-[24px] border border-slate-200 bg-white p-4", mirror && "text-right")}>
      <div className={cn("flex items-center gap-3", mirror && "flex-row-reverse")}>
        <div className="min-w-0 flex-1">
          <div className={cn("flex items-center gap-2", mirror && "justify-end")}>
            <span className="truncate font-semibold text-slate-950">{player.name}</span>
            <Badge variant="outline">{player.team}</Badge>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            평균 {player.averageRating ? player.averageRating.toFixed(1) : "-"} · 참여 {player.ratingCount}명
          </div>
        </div>
        <div className={cn("rounded-2xl border px-3 py-2 text-sm font-bold", ratingTone(value))}>{value.toFixed(1)}</div>
      </div>

      <div className="mt-4 space-y-3">
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Progress value={player.averageRating * 10} className="h-2" />
        {player.commentHighlights.length > 0 ? (
          <div className="space-y-2">
            {player.commentHighlights.map((comment, index) => (
              <div key={`${player.playerId}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">
                {comment}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SetRatingPanel({ data }: { data: SetDetailData }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const allPlayers = useMemo(() => [...data.teamAPlayers, ...data.teamBPlayers], [data.teamAPlayers, data.teamBPlayers]);
  const initialRatings = useMemo(
    () => Object.fromEntries(allPlayers.map((player) => [player.playerId, data.viewerRatings[player.playerId] ?? 5])),
    [allPlayers, data.viewerRatings],
  );
  const [draftRatings, setDraftRatings] = useState<Record<string, number>>(initialRatings);
  const [touchedIds, setTouchedIds] = useState<Record<string, true>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canWrite = status === "authenticated" && Boolean(session?.user?.hasNickname) && data.canRate;

  const roles = useMemo(() => {
    const merged = new Set<PlayerRole>([
      ...data.teamAPlayers.map((player) => player.role),
      ...data.teamBPlayers.map((player) => player.role),
    ]);

    return ["TOP", "JGL", "MID", "ADC", "SUP"].filter((role): role is PlayerRole => merged.has(role as PlayerRole));
  }, [data.teamAPlayers, data.teamBPlayers]);

  const changedRatings = useMemo(
    () =>
      Object.keys(touchedIds)
        .map((playerId) => ({ playerId, score: draftRatings[playerId] }))
        .filter(({ playerId, score }) => data.viewerRatings[playerId] !== score),
    [data.viewerRatings, draftRatings, touchedIds],
  );

    const disabledReason = !data.canRate
    ? "종료된 경기 세트만 평점 작성이 가능합니다."
    : status !== "authenticated"
      ? "로그인 후 세트 평점을 남길 수 있습니다."
      : !session?.user?.hasNickname
        ? "닉네임을 먼저 설정하면 세트 평점을 남길 수 있습니다."
      : changedRatings.length === 0
        ? "슬라이더를 움직여 변경한 선수 점수를 저장할 수 있습니다."
        : null;

  return (
    <Card>
        <CardHeader>
          <SectionTitle
            eyebrow="Set Rating"
            title={`${data.title} 선수 평점`}
            description="세트가 끝난 뒤 선수 평점을 남기면 코인을 얻고, 평점 보드에서 팬 평균과 바로 비교할 수 있습니다."
          />
        </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Reward</div>
            <div className="mt-2 font-semibold text-slate-950">선수 1명 저장마다 +2 Coin</div>
            <div className="mt-1 text-slate-600">한 번에 여러 명을 저장하면 코인도 함께 누적됩니다.</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Use</div>
            <div className="mt-2 font-semibold text-slate-950">모은 코인은 프로필 꾸미기에 사용</div>
            <div className="mt-1 text-slate-600">인장과 테마 효과 같은 보상으로 이어집니다.</div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {disabledReason ?? `현재 선택한 변경 ${changedRatings.length}건을 저장할 수 있습니다. 저장 시 ${changedRatings.length * 2} Coin이 반영됩니다.`}
        </div>

        <div className="space-y-4">
          {roles.map((role) => {
            const left = data.teamAPlayers.find((player) => player.role === role);
            const right = data.teamBPlayers.find((player) => player.role === role);

            return (
              <div key={role} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_84px_minmax(0,1fr)] lg:items-center">
                {left ? (
                  <PlayerRatingCard
                    player={left}
                    value={draftRatings[left.playerId] ?? 5}
                    disabled={!canWrite || pending}
                    onChange={(value) => {
                      setDraftRatings((current) => ({ ...current, [left.playerId]: value }));
                      setTouchedIds((current) => ({ ...current, [left.playerId]: true }));
                      setFeedback(null);
                    }}
                  />
                ) : (
                  <div className="hidden lg:block" />
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white">
                  {roleLabels[role]}
                </div>

                {right ? (
                  <PlayerRatingCard
                    player={right}
                    value={draftRatings[right.playerId] ?? 5}
                    disabled={!canWrite || pending}
                    mirror
                    onChange={(value) => {
                      setDraftRatings((current) => ({ ...current, [right.playerId]: value }));
                      setTouchedIds((current) => ({ ...current, [right.playerId]: true }));
                      setFeedback(null);
                    }}
                  />
                ) : (
                  <div className="hidden lg:block" />
                )}
              </div>
            );
          })}
        </div>

        {feedback ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{feedback}</div> : null}

        <div className="flex justify-end">
          <Button
            className="min-w-40"
            disabled={!canWrite || pending || changedRatings.length === 0}
            onClick={async () => {
              setPending(true);
              const error = await postJson(`/api/matches/${data.matchId}/sets/${data.setNumber}/ratings`, {
                ratings: changedRatings,
              });
              setFeedback(error ?? `세트 평점을 저장했습니다. ${changedRatings.length * 2} Coin이 반영되었습니다.`);
              setPending(false);
              if (!error) {
                startTransition(() => router.refresh());
              }
            }}
          >
            {!canWrite ? "평점 작성 불가" : pending ? "저장 중..." : `변경 ${changedRatings.length}건 일괄 저장`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SetRatingsBoard({ data }: { data: SetDetailData }) {
  const totalParticipants = data.teamAPlayers.reduce((sum, player) => sum + player.ratingCount, 0) + data.teamBPlayers.reduce((sum, player) => sum + player.ratingCount, 0);

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          eyebrow="Ratings Snapshot"
          title={`${data.title} 평점 현황`}
          description={`${getTeamDisplayName(data.teamA)} vs ${getTeamDisplayName(data.teamB)} · 참여 ${totalParticipants}건`}
        />
      </CardHeader>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
        {[{ team: data.teamA, players: data.teamAPlayers }, { team: data.teamB, players: data.teamBPlayers }].map((group, index) => (
          <div key={`${data.id}-${group.team}-${index}`} className="rounded-[24px] border border-slate-200 bg-white p-4">
            <div className="mb-4">
              <div className="text-lg font-bold text-slate-950">{getTeamDisplayName(group.team)}</div>
              <div className="text-sm text-slate-500">선수별 평균 평점</div>
            </div>
            <div className="space-y-3">
              {group.players.map((player) => (
                <div key={player.playerId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-950">{player.name}</span>
                        <Badge variant="outline">{player.role}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">참여 {player.ratingCount}명</div>
                    </div>
                    <div className={cn("rounded-2xl border px-3 py-2 text-sm font-bold", ratingTone(player.averageRating || 0))}>
                      {player.averageRating ? player.averageRating.toFixed(1) : "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

