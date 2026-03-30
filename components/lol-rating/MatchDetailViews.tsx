'use client';

import Link from 'next/link';
import Image from 'next/image';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toBlob } from 'html-to-image';

import type { MatchComment, MatchData, MatchDetailData, MatchSetSummary } from './types';
import { getTeamDisplayName } from './team-branding';
import { Avatar, Badge, Button, Card, CardContent } from './ui';
import { cn, getInitials } from './utils';

type DetailState = 'PRE_MATCH' | 'LIVE' | 'FINISHED';
type CommentSort = 'latest' | 'top';
const PREDICTION_JOIN_REWARD_COINS = 10;
const ROLE_ORDER: Array<'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP'> = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const ROLE_META: Record<'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP', { iconPath: string; label: string }> = {
  TOP: { iconPath: '/icons/positions/icon-position-top.png', label: '탑' },
  JGL: { iconPath: '/icons/positions/icon-position-jungle.png', label: '정글' },
  MID: { iconPath: '/icons/positions/icon-position-middle.png', label: '미드' },
  ADC: { iconPath: '/icons/positions/icon-position-bottom.png', label: '원딜' },
  SUP: { iconPath: '/icons/positions/icon-position-utility.png', label: '서폿' },
};

function resolveDetailState(match: MatchData): DetailState {
  if (match.status === 'finished') {
    return 'FINISHED';
  }
  return match.predictionLocked ? 'LIVE' : 'PRE_MATCH';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatScore(score: string) {
  return score === '-' ? 'VS' : score.replace(' : ', ' : ');
}

function getWinnerTeam(match: MatchData): string | null {
  if (match.status !== 'finished' || match.score === '-') {
    return null;
  }
  const [scoreA, scoreB] = match.score.split(' : ').map(Number);
  if (Number.isNaN(scoreA) || Number.isNaN(scoreB) || scoreA === scoreB) {
    return null;
  }
  return scoreA > scoreB ? match.teamA : match.teamB;
}

function getCurrentSetLabel(sets: MatchSetSummary[]) {
  const current = sets.find((set) => !set.isPlayed);
  if (current) {
    return `SET ${current.setNumber}`;
  }
  const lastPlayed = sets.filter((set) => set.isPlayed).at(-1);
  return lastPlayed ? `SET ${lastPlayed.setNumber}` : 'SET -';
}

function getStatusBadge(state: DetailState) {
  if (state === 'PRE_MATCH') {
    return { label: '예정', variant: 'accent' as const };
  }
  if (state === 'LIVE') {
    return { label: '진행중', variant: 'danger' as const };
  }
  return { label: '종료', variant: 'success' as const };
}

function getSeriesFormatLabel(sets: MatchSetSummary[]) {
  const maxSetNumber = sets.reduce((max, set) => Math.max(max, set.setNumber), 0);
  if (maxSetNumber >= 5) {
    return 'BO5';
  }
  return 'BO3';
}

function getRatingChipTone(score: number | null, opponentScore: number | null) {
  if (score === null) {
    return 'bg-slate-500 text-white';
  }
  if (opponentScore === null) {
    return 'bg-slate-700 text-white';
  }
  if (score > opponentScore) {
    return 'bg-slate-800 text-white';
  }
  if (score < opponentScore) {
    return 'bg-slate-600 text-white';
  }
  return 'bg-slate-700 text-white';
}

function getShareRatingChipColor(score: number | null, opponentScore: number | null) {
  if (score === null) {
    return '#64748b';
  }
  if (opponentScore === null) {
    return '#334155';
  }
  if (score > opponentScore) {
    return '#0f172a';
  }
  if (score < opponentScore) {
    return '#475569';
  }
  return '#334155';
}

function getCalendarDayDiff(target: Date, now: Date) {
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - n.getTime()) / 86400000);
}

function formatPredictionCountdown(targetIso: string | null, nowMs: number) {
  if (!targetIso) {
    return '마감 정보 없음';
  }

  const now = new Date(nowMs);
  const target = new Date(targetIso);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return '마감됨';
  }

  const dayDiff = getCalendarDayDiff(target, now);
  if (dayDiff >= 1) {
    return `D-${dayDiff}`;
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function estimateHitBonusCoins(sharePct: number) {
  return Math.round(clamp(20 + ((85 - sharePct) / 70) * 40, 20, 60));
}

function estimateOddsPercent(sharePct: number) {
  return Math.round(clamp(120 + ((85 - sharePct) / 70) * 80, 120, 200));
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? '요청을 처리하지 못했습니다.');
  }
}

function MatchHeader({ data, state }: { data: MatchDetailData; state: DetailState }) {
  const status = getStatusBadge(state);
  const seriesFormat = getSeriesFormatLabel(data.sets);
  const [scoreA, scoreB] =
    data.match.score === '-' || data.match.score === '0 : 0'
      ? ['', '']
      : data.match.score.split(' : ').map((value) => value.trim());
  const statusTone =
    state === 'PRE_MATCH'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : state === 'LIVE'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-300 bg-slate-100 text-slate-700';

  return (
    <Card className='overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]'>
      <CardContent className='px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
        <div className='text-center'>
          <div className='text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700'>{data.match.league}</div>
          <div className='mx-auto mt-3 grid max-w-[860px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 rounded-[20px] border border-slate-200 bg-white px-5 py-5 sm:px-8'>
            <div className='text-center'>
              <div className='text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl'>{getTeamDisplayName(data.match.teamA)}</div>
            </div>

            <div className='min-w-[180px] text-center'>
              <div className='flex items-center justify-center gap-3'>
                <span className='text-3xl font-black tracking-[-0.03em] text-slate-950'>{scoreA || '\u00A0'}</span>
                <span className={cn('inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-semibold', statusTone)}>
                  {status.label}
                </span>
                <span className='text-3xl font-black tracking-[-0.03em] text-slate-950'>{scoreB || '\u00A0'}</span>
              </div>
              <div className='mt-3 text-sm font-semibold text-slate-600'>{data.match.stage}</div>
            </div>

            <div className='text-center'>
              <div className='text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl'>{getTeamDisplayName(data.match.teamB)}</div>
            </div>
          </div>
          <div className='mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600'>
            <span>{formatDateTime(data.match.scheduledAt)}</span>
            <span>·</span>
            <span>{seriesFormat}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PredictionGamePanel({ match }: { match: MatchData }) {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<string>(match.myPredictionTeam ?? '');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completedTeam, setCompletedTeam] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const canWrite = true;

  const blockReason = !canWrite
    ? '예측에 참여할 수 없습니다.'
    : match.teamA === 'TBD' || match.teamB === 'TBD'
        ? '대진 확정 전에는 참여할 수 없습니다.'
        : match.predictionLocked
          ? '예측이 마감되었습니다.'
          : !selectedTeam
            ? '응원 팀을 선택해 주세요.'
            : null;
  const selectedShare = selectedTeam === match.teamA ? match.predictionSummary.teamA : selectedTeam === match.teamB ? match.predictionSummary.teamB : null;
  const estimatedBonusCoins = selectedShare === null ? null : estimateHitBonusCoins(selectedShare);
  const teamAOddsPercent = estimateOddsPercent(match.predictionSummary.teamA);
  const teamBOddsPercent = estimateOddsPercent(match.predictionSummary.teamB);

  const renderPickCard = (team: string) => {
    const isLeft = team === match.teamA;
    const ratio = isLeft ? match.predictionSummary.teamA : match.predictionSummary.teamB;
    const active = selectedTeam === team;

    return (
      <button
        key={team}
        type='button'
        onClick={() => {
          setSelectedTeam(team);
          setFeedback(null);
          setCompletedTeam(null);
        }}
        className={cn(
          'rounded-[20px] border p-4 transition',
          isLeft ? 'text-left' : 'text-right',
          active
            ? 'border-sky-300 bg-[linear-gradient(180deg,#f0f9ff_0%,#e0f2fe_100%)] shadow-[0_12px_30px_rgba(14,165,233,0.18)]'
            : 'border-slate-200 bg-slate-50 hover:bg-white',
        )}
      >
        
        <div className='mt-2 text-2xl font-black text-slate-950'>{getTeamDisplayName(team)}</div>
      </button>
    );
  };

  return (
    <section id='prediction-panel' className='space-y-4'>
      <div className='rounded-[22px] border border-slate-200 bg-white p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <div className='text-sm font-bold text-slate-950'>승부예측 배틀</div>
          <div className='text-xs text-slate-500'>총 {match.predictionSummary.totalVotes.toLocaleString()}명 참여</div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 sm:items-stretch'>
          {renderPickCard(match.teamA)}
          {renderPickCard(match.teamB)}
        </div>

        <div className='mt-4 rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3'>
          <div className='mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200'>
            <div className='flex h-full w-full'>
              <div className='h-full bg-sky-500' style={{ width: `${match.predictionSummary.teamA}%` }} />
              <div className='h-full bg-slate-500' style={{ width: `${match.predictionSummary.teamB}%` }} />
            </div>
          </div>
          <div className='mt-2 flex items-center justify-between text-base font-black text-slate-800'>
            <span>
              {match.predictionSummary.teamA}%{" "}
              <span className='text-xs font-medium text-slate-500'>배당 {teamAOddsPercent}%</span>
            </span>
            <span>
              {match.predictionSummary.teamB}%{" "}
              <span className='text-xs font-medium text-slate-500'>배당 {teamBOddsPercent}%</span>
            </span>
          </div>
        </div>
      </div>

      <div className='rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'>
        <div>참여 시 +{PREDICTION_JOIN_REWARD_COINS} 코인 지급</div>
        <div className='mt-1'>
          적중 시 배당에 따라 추가 지급
          {estimatedBonusCoins !== null ? ` (현재 선택 기준 예상 +${estimatedBonusCoins} 코인)` : ''}
        </div>
        <div className='mt-1'>경기시작 10분 전 예측 마감</div>
      </div>

      <Button
        id='prediction-submit'
        className='w-full'
        disabled={pending || blockReason !== null}
        onClick={async () => {
          try {
            setPending(true);
            await postJson(`/api/matches/${match.id}/prediction`, { selectedTeam });
            setFeedback(null);
            setCompletedTeam(selectedTeam);
            startTransition(() => router.refresh());
          } catch (error) {
            setFeedback(error instanceof Error ? error.message : '예측 등록에 실패했습니다.');
          } finally {
            setPending(false);
          }
        }}
      >
        {pending
          ? '전략 확정 중...'
          : completedTeam
            ? `${getTeamDisplayName(completedTeam)} 선택완료`
            : selectedTeam
              ? `${getTeamDisplayName(selectedTeam)} 선택하기`
              : '예측하기'}
      </Button>
      {feedback ? <div className='rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>{feedback}</div> : null}
    </section>
  );
}

function PreMatchInsights({ data }: { data: MatchDetailData }) {
  const { preMatchInsights, match } = data;

  const getPlayerByTeamAndRole = (teamCode: string, role: 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP') =>
    match.players
      .filter((player) => player.team === teamCode && player.role === role)
      .slice()
      .sort((a, b) => b.ratingCount - a.ratingCount)[0] ?? null;

  return (
    <Card>
      <CardContent className='px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
        
        <h2 className='mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950'>예측 참고 정보</h2>

        <div className='mt-4 space-y-3'>
          <div className='grid grid-cols-[minmax(0,1fr)_100px_minmax(0,1fr)] items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4'>
            <div className='text-right text-lg font-black text-slate-950'>{match.teamA}</div>
            <div className='text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>VS</div>
            <div className='text-left text-lg font-black text-slate-950'>{match.teamB}</div>
          </div>

          <div className='rounded-[20px] border border-slate-200 bg-white p-4'>
            <div className='mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>상대전적</div>
            <div className='grid grid-cols-[minmax(0,1fr)_100px_minmax(0,1fr)] items-center gap-3'>
              <div className='text-right'>
                <div className='text-3xl font-black text-slate-950'>{preMatchInsights.h2h.teamAWins}</div>
              </div>
              <div className='text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>VS</div>
              <div>
                <div className='text-3xl font-black text-slate-950'>{preMatchInsights.h2h.teamBWins}</div>
              </div>
            </div>
          </div>

          <div className='rounded-[20px] border border-slate-200 bg-white p-4'>
            <div className='mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>최근전적</div>
            <div className='grid grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)] items-center gap-3'>
              <div className='flex items-center justify-end gap-1.5'>
                {Array.from({ length: 5 }).map((_, index) => {
                  const result = preMatchInsights.teamAForm.recent[index] ?? null;
                  return (
                    <span
                      key={`teamA-form-${index}`}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-black',
                        result === 'W'
                          ? 'bg-emerald-100 text-emerald-700'
                          : result === 'L'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {result ?? '-'}
                    </span>
                  );
                })}
              </div>
              <div className='text-center text-xs font-semibold text-slate-500'>최근 5경기</div>
              <div className='flex items-center justify-start gap-1.5'>
                {Array.from({ length: 5 }).map((_, index) => {
                  const result = preMatchInsights.teamBForm.recent[index] ?? null;
                  return (
                    <span
                      key={`teamB-form-${index}`}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-black',
                        result === 'W'
                          ? 'bg-emerald-100 text-emerald-700'
                          : result === 'L'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {result ?? '-'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className='rounded-[20px] border border-slate-200 bg-white p-4'>
            <div className='mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>평균평점</div>
            <div className='space-y-2'>
              {ROLE_ORDER.map((role) => {
                const left = getPlayerByTeamAndRole(match.teamA, role);
                const right = getPlayerByTeamAndRole(match.teamB, role);
                const leftRating = left ? Number(left.rating.toFixed(1)) : null;
                const rightRating = right ? Number(right.rating.toFixed(1)) : null;

                return (
                  <div key={role} className='grid grid-cols-[minmax(0,1fr)_58px_40px_58px_minmax(0,1fr)] items-center gap-3 text-sm'>
                    <div className='truncate text-left text-lg font-semibold text-slate-950'>
                      {left ? (
                        <Link href={`/player/${left.id}`} className='hover:text-sky-700 hover:underline'>
                          {left.name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </div>
                    <div
                      className={cn(
                        'rounded-md px-2 py-1 text-center text-sm font-extrabold leading-none',
                        getRatingChipTone(leftRating, rightRating),
                      )}
                    >
                      {leftRating !== null ? leftRating.toFixed(1) : '-'}
                    </div>
                    <div className='flex items-center justify-center'>
                      <Image src={ROLE_META[role].iconPath} alt={ROLE_META[role].label} width={20} height={20} className='h-5 w-5 object-contain' />
                    </div>
                    <div
                      className={cn(
                        'rounded-md px-2 py-1 text-center text-sm font-extrabold leading-none',
                        getRatingChipTone(rightRating, leftRating),
                      )}
                    >
                      {rightRating !== null ? rightRating.toFixed(1) : '-'}
                    </div>
                    <div className='truncate text-right text-lg font-semibold text-slate-950'>
                      {right ? (
                        <Link href={`/player/${right.id}`} className='hover:text-sky-700 hover:underline'>
                          {right.name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreMatchView({ data }: { data: MatchDetailData }) {
  return (
    <div className='space-y-5'>
      <Card>
        <CardContent className='space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
          <PredictionGamePanel match={data.match} />
        </CardContent>
      </Card>

      <PreMatchInsights data={data} />
    </div>
  );
}

function LiveView({ data }: { data: MatchDetailData }) {
  return (
    <div className='space-y-5'>
      <Card>
        <CardContent className='px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='rounded-[18px] border border-slate-200 bg-white px-4 py-3'>
              <div className='text-xs uppercase tracking-[0.16em] text-slate-500'>현재 스코어</div>
              <div className='mt-2 text-2xl font-black text-slate-950'>{formatScore(data.match.score)}</div>
            </div>
            <div className='rounded-[18px] border border-slate-200 bg-white px-4 py-3'>
              <div className='text-xs uppercase tracking-[0.16em] text-slate-500'>상태</div>
              <div className='mt-2 text-2xl font-black text-slate-950'>진행중</div>
            </div>
          </div>
          <div className='mt-4 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'>
            매치 평점은 경기 종료 후 이 페이지에서 바로 참여할 수 있습니다.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StarScorePicker({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (score: number) => void;
}) {
  const current = value ?? 0;
  return (
    <div className='flex items-center gap-1'>
      {[1, 2, 3, 4, 5].map((index) => {
        const full = current >= index * 2;
        const half = !full && current === index * 2 - 1;
        return (
          <button
            key={index}
            type='button'
            disabled={disabled}
            className='allow-disabled-cursor relative h-7 w-7 rounded-sm transition hover:scale-105 disabled:hover:scale-100'
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const isLeftHalf = event.clientX - rect.left < rect.width / 2;
              const score = index * 2 - (isLeftHalf ? 1 : 0);
              onChange(score);
            }}
            aria-label={`${index}별`}
          >
            <span className='absolute inset-0 text-2xl leading-7 text-slate-300'>★</span>
            {full ? <span className='absolute inset-0 text-2xl leading-7 text-slate-800'>★</span> : null}
            {half ? (
              <span className='absolute inset-0 w-1/2 overflow-hidden text-2xl leading-7 text-slate-800'>★</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FinishedView({ data }: { data: MatchDetailData }) {
  const COMMENT_PAGE_SIZE = 8;
  const router = useRouter();
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [activeCommentPlayerId, setActiveCommentPlayerId] = useState<string | null>(null);
  const [commentDraftByPlayerId, setCommentDraftByPlayerId] = useState<Record<string, string>>({});
  const [viewerScoreByPlayerId, setViewerScoreByPlayerId] = useState<Record<string, number>>({});
  const [commentPendingByPlayerId, setCommentPendingByPlayerId] = useState<Record<string, boolean>>({});
  const [commentSavedByPlayerId, setCommentSavedByPlayerId] = useState<Record<string, boolean>>({});
  const [ratingCommentPage, setRatingCommentPage] = useState(1);
  const [ratingActionError, setRatingActionError] = useState<string | null>(null);
  const canWrite = true;
  const playerById = useMemo(() => new Map(data.match.players.map((player) => [player.id, player])), [data.match.players]);
  const totalRatingCommentPages = Math.max(1, Math.ceil(data.match.ratingComments.length / COMMENT_PAGE_SIZE));
  const pagedRatingComments = useMemo(() => {
    const startIndex = (ratingCommentPage - 1) * COMMENT_PAGE_SIZE;
    return data.match.ratingComments.slice(startIndex, startIndex + COMMENT_PAGE_SIZE);
  }, [data.match.ratingComments, ratingCommentPage]);

  const getPlayerByTeamAndRole = (teamCode: string, role: 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP') =>
    data.match.players
      .filter((player) => player.team === teamCode && player.role === role)
      .slice()
      .sort((a, b) => b.ratingCount - a.ratingCount)[0] ?? null;

  useEffect(() => {
    setCommentDraftByPlayerId((prev) => {
      const next = { ...prev };
      for (const player of data.match.players) {
        if (typeof next[player.id] === 'undefined') {
          next[player.id] = player.viewerComment ?? '';
        }
      }
      return next;
    });
    setViewerScoreByPlayerId((prev) => {
      const next = { ...prev };
      for (const player of data.match.players) {
        if (player.viewerScore !== null) {
          next[player.id] = player.viewerScore;
        }
      }
      return next;
    });
  }, [data.match.players]);

  useEffect(() => {
    setRatingCommentPage((prev) => Math.min(prev, totalRatingCommentPages));
  }, [totalRatingCommentPages]);

  const submitQuickRating = async (playerId: string, score: number) => {
    if (!canWrite || pendingPlayerId) {
      return;
    }
    try {
      setRatingActionError(null);
      setPendingPlayerId(playerId);
      const preservedComment = commentDraftByPlayerId[playerId] ?? playerById.get(playerId)?.viewerComment ?? '';
      await postJson(`/api/matches/${data.match.id}/ratings`, { playerId, score, comment: preservedComment });
      setViewerScoreByPlayerId((prev) => ({ ...prev, [playerId]: score }));
      setActiveCommentPlayerId(playerId);
      setCommentSavedByPlayerId((prev) => ({ ...prev, [playerId]: false }));
      startTransition(() => router.refresh());
    } catch (error) {
      setRatingActionError(error instanceof Error ? error.message : '평점 저장에 실패했습니다.');
    } finally {
      setPendingPlayerId(null);
    }
  };

  const savePlayerComment = async (playerId: string) => {
    if (!canWrite || pendingPlayerId || commentPendingByPlayerId[playerId]) {
      return;
    }
    const score = viewerScoreByPlayerId[playerId] ?? playerById.get(playerId)?.viewerScore ?? null;
    if (score === null) {
      return;
    }
    try {
      setRatingActionError(null);
      setCommentPendingByPlayerId((prev) => ({ ...prev, [playerId]: true }));
      const comment = commentDraftByPlayerId[playerId] ?? '';
      await postJson(`/api/matches/${data.match.id}/ratings`, { playerId, score, comment });
      setCommentSavedByPlayerId((prev) => ({ ...prev, [playerId]: true }));
      window.setTimeout(() => {
        setCommentSavedByPlayerId((prev) => ({ ...prev, [playerId]: false }));
      }, 1200);
      startTransition(() => router.refresh());
    } catch (error) {
      setRatingActionError(error instanceof Error ? error.message : '코멘트 저장에 실패했습니다.');
    } finally {
      setCommentPendingByPlayerId((prev) => ({ ...prev, [playerId]: false }));
    }
  };

  const copyShareCardImage = async () => {
    const cardElement = shareCardRef.current;
    if (!cardElement || !navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
      return;
    }
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    }
    const rect = cardElement.getBoundingClientRect();
    const blob = await toBlob(cardElement, {
      cacheBust: true,
      pixelRatio: Math.max(2, window.devicePixelRatio || 1),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      fetchRequestInit: { cache: 'no-store' },
      style: {
        margin: '0',
        transform: 'none',
        borderRadius: '22px',
        overflow: 'hidden',
      },
    });
    if (!blob) {
      return;
    }
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1200);
  };

  return (
    <div className='space-y-5'>
      <Card>
        <CardContent className='relative space-y-4 px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pt-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-2xl font-black tracking-[-0.03em] text-slate-950'>평점 참여하기&확인하기</h2>
            <div className='text-xs text-slate-500'>선수 아래 별을 눌러 바로 평점을 남기세요.</div>
          </div>
          {ratingActionError ? <div className='text-sm font-medium text-rose-600'>{ratingActionError}</div> : null}
          {(() => {
            const activePlayer = activeCommentPlayerId ? playerById.get(activeCommentPlayerId) ?? null : null;
            const activePlayerScore =
              activePlayer ? (viewerScoreByPlayerId[activePlayer.id] ?? activePlayer.viewerScore ?? null) : null;
            return (
              <>
          <div className='mx-auto max-w-[780px] space-y-2'>
            {ROLE_ORDER.map((role) => {
              const left = getPlayerByTeamAndRole(data.match.teamA, role);
              const right = getPlayerByTeamAndRole(data.match.teamB, role);
              const leftRating = left ? Number(left.rating.toFixed(1)) : null;
              const rightRating = right ? Number(right.rating.toFixed(1)) : null;
              const leftViewerScore = left ? (viewerScoreByPlayerId[left.id] ?? left.viewerScore) : null;
              const rightViewerScore = right ? (viewerScoreByPlayerId[right.id] ?? right.viewerScore) : null;
              const leftRevealed = leftViewerScore !== null;
              const rightRevealed = rightViewerScore !== null;

              return (
                <div key={role}>
                  <div className='grid grid-cols-[minmax(120px,180px)_58px_40px_58px_minmax(120px,180px)] items-center justify-center gap-3 text-sm'>
                    <div className='min-w-0'>
                      <button
                        type='button'
                        disabled={!left || !canWrite || Boolean(pendingPlayerId)}
                        onClick={() => left && submitQuickRating(left.id, leftViewerScore ?? 8)}
                        className='allow-disabled-cursor w-full truncate text-left text-xl font-semibold text-slate-950 enabled:hover:text-sky-700'
                      >
                        {left?.name ?? '-'}
                      </button>
                      <div className='mt-0.5'>
                        <StarScorePicker
                          value={leftViewerScore}
                          disabled={!left || !canWrite || Boolean(pendingPlayerId)}
                          onChange={(score) => left && submitQuickRating(left.id, score)}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        'rounded-md px-2 py-1 text-center text-sm font-extrabold leading-none text-white transition',
                        getRatingChipTone(leftRating, rightRating),
                        !leftRevealed ? 'blur-[6px] opacity-35' : '',
                      )}
                    >
                      {!leftRevealed ? '•••' : leftRating !== null ? leftRating.toFixed(1) : '-'}
                    </div>
                    <div className='flex items-center justify-center'>
                      <Image src={ROLE_META[role].iconPath} alt={ROLE_META[role].label} width={20} height={20} className='h-5 w-5 object-contain' />
                    </div>
                    <div
                      className={cn(
                        'rounded-md px-2 py-1 text-center text-sm font-extrabold leading-none text-white transition',
                        getRatingChipTone(rightRating, leftRating),
                        !rightRevealed ? 'blur-[6px] opacity-35' : '',
                      )}
                    >
                      {!rightRevealed ? '•••' : rightRating !== null ? rightRating.toFixed(1) : '-'}
                    </div>
                    <div className='min-w-0'>
                      <button
                        type='button'
                        disabled={!right || !canWrite || Boolean(pendingPlayerId)}
                        onClick={() => right && submitQuickRating(right.id, rightViewerScore ?? 8)}
                        className='allow-disabled-cursor w-full truncate text-right text-xl font-semibold text-slate-950 enabled:hover:text-sky-700'
                      >
                        {right?.name ?? '-'}
                      </button>
                      <div className='mt-0.5 flex justify-end'>
                        <StarScorePicker
                          value={rightViewerScore}
                          disabled={!right || !canWrite || Boolean(pendingPlayerId)}
                          onChange={(score) => right && submitQuickRating(right.id, score)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
                {activePlayer ? (
                  <div className='absolute bottom-3 left-5 right-5 z-20 sm:bottom-4 sm:left-6 sm:right-6'>
                    <div className='rounded-[14px] border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/85'>
                      <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
                        <span className='font-semibold text-slate-700'>
                          {activePlayer.name} · {activePlayer.team}
                        </span>
                        <span className='rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700'>
                          {activePlayerScore !== null ? `${activePlayerScore.toFixed(1)}점` : '별점 미선택'}
                        </span>
                        {commentSavedByPlayerId[activePlayer.id] ? <span className='text-slate-500'>저장됨</span> : null}
                      </div>
                      <div className='mt-1.5 flex items-center gap-2'>
                        <input
                          type='text'
                          value={commentDraftByPlayerId[activePlayer.id] ?? activePlayer.viewerComment ?? ''}
                          onChange={(event) =>
                            setCommentDraftByPlayerId((prev) => ({
                              ...prev,
                              [activePlayer.id]: event.target.value,
                            }))
                          }
                          placeholder='간단 코멘트를 남겨보세요 (선택)'
                          className='h-10 min-w-0 flex-1 rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-sky-300'
                          disabled={!canWrite || Boolean(commentPendingByPlayerId[activePlayer.id])}
                        />
                        <button
                          type='button'
                          className='rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300'
                          onClick={() => setActiveCommentPlayerId(null)}
                        >
                          닫기
                        </button>
                        <button
                          type='button'
                          className='rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60'
                          onClick={() => savePlayerComment(activePlayer.id)}
                          disabled={
                            !canWrite ||
                            Boolean(commentPendingByPlayerId[activePlayer.id]) ||
                            (viewerScoreByPlayerId[activePlayer.id] ?? activePlayer.viewerScore ?? null) === null
                          }
                        >
                          {commentPendingByPlayerId[activePlayer.id] ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-4 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
          <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]'>
            <div className='space-y-3'>
              <div className='text-2xl font-black tracking-[-0.03em] text-slate-950'>실시간 평점 코멘트</div>
              {data.match.ratingComments.length > 0 ? (
                <>
                  <div className='space-y-2'>
                    {pagedRatingComments.map((item) => (
                      <div key={item.id} className='rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2'>
                        <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
                          <span className='font-semibold text-slate-700'>{item.user}</span>
                          <span>·</span>
                          <span>{item.team} {item.playerName}</span>
                          <span className='rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700'>{item.score.toFixed(1)}</span>
                          <span>· {item.createdLabel}</span>
                        </div>
                        <div className='mt-1 break-words text-sm text-slate-800'>{item.text}</div>
                      </div>
                    ))}
                  </div>
                  {totalRatingCommentPages > 1 ? (
                    <div className='flex flex-wrap items-center justify-center gap-1.5 pt-1'>
                      {Array.from({ length: totalRatingCommentPages }, (_, idx) => idx + 1).map((page) => (
                        <button
                          key={`rating_comment_page_${page}`}
                          type='button'
                          onClick={() => setRatingCommentPage(page)}
                          className={cn(
                            'h-8 min-w-8 rounded-full border px-2 text-xs font-semibold',
                            ratingCommentPage === page
                              ? 'border-slate-700 bg-slate-700 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className='rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500'>
                  아직 등록된 선수 평점 코멘트가 없습니다.
                </div>
              )}
            </div>
            <div className='rounded-[16px] border border-slate-200 bg-white p-4 lg:sticky lg:top-4 lg:self-start'>
              <div className='text-2xl font-black tracking-[-0.03em] text-slate-950'>내 예측 결과</div>
              <div className='mt-3 grid gap-3'>
                <div>
                  <div className='text-xs text-slate-500'>선택 팀</div>
                  <div className='mt-1 text-lg font-black text-slate-950'>{data.match.myPredictionTeam ?? '미참여'}</div>
                </div>
                <div>
                  <div className='text-xs text-slate-500'>결과</div>
                  <div className='mt-1 text-lg font-black text-slate-950'>
                    {data.match.myPredictionSettlementResult === 'hit' ? '적중' : data.match.myPredictionSettlementResult === 'miss' ? '실패' : '대기'}
                  </div>
                </div>
                <div>
                  <div className='text-xs text-slate-500'>보상</div>
                  <div className='mt-1 text-lg font-black text-slate-950'>+{data.match.myPredictionSettlementCoins}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-3 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
          <div className='flex items-center justify-between gap-3'>
            <div className='text-sm font-semibold text-slate-700'>공유 카드</div>
            <button
              type='button'
              className='rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300'
              onClick={copyShareCardImage}
            >
              <span className='inline-flex items-center gap-1.5'>
                <svg viewBox='0 0 20 20' aria-hidden='true' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                  <rect x='3' y='4' width='14' height='12' rx='2' />
                  <circle cx='8' cy='8' r='1.2' fill='currentColor' stroke='none' />
                  <path d='M4.8 14l3.6-3 2.8 2.2 2.4-1.8 1.6 2.6' />
                </svg>
                {shareCopied ? '이미지 복사됨' : '이미지 복사'}
              </span>
            </button>
          </div>
          <div data-share-card='true' ref={shareCardRef} className='mx-auto w-full max-w-[392px] aspect-[4/5] overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.2),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,0.2),transparent_35%),linear-gradient(165deg,#0f172a_0%,#111827_55%,#1e293b_100%)] p-5 text-white'>
            <div className='flex items-center justify-between gap-3'>
              <div className='inline-flex items-center gap-2'>
                <span className='inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300 text-[11px] font-black text-sky-950'>GG</span>
                <span className='text-sm font-bold text-slate-100'>GG 레이팅</span>
              </div>
              <div className='text-right text-[11px] text-slate-300'>{formatDateTime(data.match.scheduledAt)}</div>
            </div>
            <div className='mt-3 text-center text-xs font-semibold tracking-[0.16em] text-slate-300'>{data.match.league}</div>
            <div className='mt-1 text-center text-sm font-semibold text-slate-200'>{data.match.stage} · {getSeriesFormatLabel(data.sets)}</div>
            <div className='mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
              <div className='text-center text-lg font-black'>{data.match.teamA}</div>
              <div className='text-center text-4xl font-black tracking-[-0.03em]'>{data.match.score.replace(' : ', ' - ')}</div>
              <div className='text-center text-lg font-black'>{data.match.teamB}</div>
            </div>
            <div className='mt-7 rounded-[14px] border border-white/20 bg-white/8 p-3.5'>
              <div className='space-y-5'>
                {ROLE_ORDER.map((role) => {
                  const left = getPlayerByTeamAndRole(data.match.teamA, role);
                  const right = getPlayerByTeamAndRole(data.match.teamB, role);
                  const leftRating = left ? Number(left.rating.toFixed(1)) : null;
                  const rightRating = right ? Number(right.rating.toFixed(1)) : null;

                  return (
                    <div key={`share_${role}`} className='grid grid-cols-[minmax(90px,1fr)_48px_32px_48px_minmax(90px,1fr)] items-center gap-1.5 text-center'>
                      <div className='truncate pl-2 text-left text-[12px] font-semibold text-slate-100'>
                        {left?.name ?? '-'}
                      </div>
                      <div className='rounded-md px-1 py-[3px] text-[11px] font-semibold text-white' style={{ backgroundColor: getShareRatingChipColor(leftRating, rightRating) }}>
                        {leftRating !== null ? leftRating.toFixed(1) : '-'}
                      </div>
                      <div className='flex w-8 items-center justify-center'>
                        <img src={ROLE_META[role].iconPath} alt={ROLE_META[role].label} width={18} height={18} className='h-[18px] w-[18px] translate-x-[1px] object-contain' />
                      </div>
                      <div className='rounded-md px-1 py-[3px] text-[11px] font-semibold text-white' style={{ backgroundColor: getShareRatingChipColor(rightRating, leftRating) }}>
                        {rightRating !== null ? rightRating.toFixed(1) : '-'}
                      </div>
                      <div className='truncate pr-2 text-right text-[12px] font-semibold text-slate-100'>
                        {right?.name ?? '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CommentInputBar({
  matchId,
  parentId,
  placeholder,
  compact = false,
  onCancelReply,
  onSubmitted,
}: {
  matchId: string;
  parentId?: string | null;
  placeholder: string;
  compact?: boolean;
  onCancelReply?: () => void;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canWrite = status === 'authenticated' && Boolean(session?.user?.hasNickname);

  return (
    <div className={cn('rounded-[18px] border border-slate-200 bg-white p-2.5', compact ? 'ml-10 sm:ml-14' : '')}>
      <div className='flex items-end gap-2'>
        <textarea
          rows={compact ? 2 : 2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className='min-h-[44px] flex-1 resize-none rounded-[14px] border border-transparent bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-200 focus:bg-white'
          placeholder={
            status !== 'authenticated'
              ? '로그인 후 댓글을 작성할 수 있습니다.'
              : !session?.user?.hasNickname
                ? '닉네임 설정 후 댓글을 작성할 수 있습니다.'
                : placeholder
          }
          disabled={!canWrite || pending}
        />
        <Button
          disabled={!canWrite || pending || text.trim().length < 2}
          className='h-11 shrink-0 rounded-[12px] px-4'
          onClick={async () => {
            try {
              setPending(true);
              await postJson(`/api/matches/${matchId}/comments`, { text, parentId: parentId ?? null });
              setText('');
              setFeedback(parentId ? '답글이 등록되었습니다.' : '댓글이 등록되었습니다.');
              startTransition(() => router.refresh());
              onSubmitted?.();
              onCancelReply?.();
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : '댓글 등록에 실패했습니다.');
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? '등록 중...' : parentId ? '답글' : '등록'}
        </Button>
      </div>
      <div className='mt-1 flex items-center justify-between gap-2 px-1'>
        <div className='text-[11px] text-slate-500'>{parentId ? '답글' : '댓글'}을 남겨보세요</div>
        <div className='flex items-center gap-2'>
          {onCancelReply ? (
            <button type='button' className='text-[11px] font-semibold text-slate-500 hover:text-slate-900' onClick={onCancelReply}>
              취소
            </button>
          ) : null}
        </div>
      </div>
      {feedback ? <div className='mt-1 px-1 text-[11px] text-slate-500'>{feedback}</div> : null}
    </div>
  );
}

function CommentActions({
  matchId,
  comment,
  canRecommend,
  canReply,
  onReplyToggle,
}: {
  matchId: string;
  comment: MatchComment;
  canRecommend: boolean;
  canReply: boolean;
  onReplyToggle?: () => void;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [likePending, setLikePending] = useState(false);

  return (
    <div className='mt-1 flex items-center gap-2 text-[11px] opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'>
      {canRecommend ? (
        <button
          type='button'
          disabled={likePending}
          className={cn(
            'rounded-full border px-2.5 py-1 font-semibold transition',
            comment.likedByMe ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
          )}
          onClick={async () => {
            if (status !== 'authenticated') {
              router.push('/signin');
              return;
            }
            try {
              setLikePending(true);
              await postJson(`/api/matches/${matchId}/comments/${comment.id}/recommend`, {});
              startTransition(() => router.refresh());
            } finally {
              setLikePending(false);
            }
          }}
        >
          추천
        </button>
      ) : null}
      {canReply ? (
        <button type='button' className='rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900' onClick={onReplyToggle}>
          답글{comment.replyCount > 0 ? ` ${comment.replyCount}` : ''}
        </button>
      ) : null}
    </div>
  );
}

function CommentBubble({
  matchId,
  comment,
  isMine,
  canReply,
  canRecommend,
  onReplyToggle,
}: {
  matchId: string;
  comment: MatchComment;
  isMine: boolean;
  canReply: boolean;
  canRecommend: boolean;
  onReplyToggle?: () => void;
}) {
  return (
    <div className='group flex w-full justify-start gap-2'>
      <Avatar className='mt-1 h-8 w-8 shrink-0 text-[11px] font-bold text-slate-700'>{getInitials(comment.user)}</Avatar>
      <div className='flex max-w-[64%] flex-col items-start sm:max-w-[56%]'>
        <div className='mb-1 flex w-full items-center gap-2 px-1 text-[11px] text-slate-500'>
          <div className='truncate font-semibold text-slate-600'>{isMine ? '나' : comment.user}</div>
          <span className='text-slate-300'>·</span>
          <div className='truncate'>{comment.createdLabel}</div>
        </div>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-6',
            'rounded-tl-md border border-slate-200 bg-white text-slate-800',
          )}
        >
          <p className='whitespace-pre-wrap break-words'>{comment.text}</p>
        </div>
        <div className='mt-1 flex w-full items-center justify-between px-1'>
          {canRecommend ? <div className='text-[11px] font-medium text-slate-500'>추천 {comment.likes}</div> : <span />}
          <CommentActions matchId={matchId} comment={comment} canRecommend={canRecommend} canReply={canReply} onReplyToggle={onReplyToggle} />
        </div>
      </div>
    </div>
  );
}

function CommentThread({ matchId, comment, replies }: { matchId: string; comment: MatchComment; replies: MatchComment[] }) {
  const { data: session } = useSession();
  const [replyOpen, setReplyOpen] = useState(false);
  const viewerId = session?.user?.id ?? null;
  const isMine = Boolean(viewerId && comment.userId && viewerId === comment.userId);
  const orderedReplies = replies.slice().reverse();

  return (
    <div className='space-y-2'>
      <CommentBubble matchId={matchId} comment={comment} isMine={isMine} canReply canRecommend onReplyToggle={() => setReplyOpen((value) => !value)} />

      {replyOpen ? (
        <CommentInputBar
          matchId={matchId}
          parentId={comment.id}
          placeholder='예상 한마디를 남겨보세요'
          compact
          onCancelReply={() => setReplyOpen(false)}
        />
      ) : null}

      {orderedReplies.length > 0 ? (
        <div className='ml-6 space-y-2 border-l border-slate-200/80 pl-3 sm:ml-10 sm:pl-4'>
          {orderedReplies.map((reply) => {
            const replyIsMine = Boolean(viewerId && reply.userId && viewerId === reply.userId);
            return <CommentBubble key={reply.id} matchId={matchId} comment={reply} isMine={replyIsMine} canReply={false} canRecommend={false} />;
          })}
        </div>
      ) : null}
    </div>
  );
}

function CommentsSection({ data }: { data: MatchDetailData }) {
  const [sort, setSort] = useState<CommentSort>('latest');

  const rootComments = useMemo(() => {
    const roots = data.match.commentsList.filter((comment) => !comment.parentId);
    if (sort === 'top') {
      return roots.slice().sort((a, b) => b.likes - a.likes);
    }
    return roots;
  }, [data.match.commentsList, sort]);

  const repliesByParent = useMemo(() => {
    const map = new Map<string, MatchComment[]>();
    for (const comment of data.match.commentsList) {
      if (!comment.parentId) {
        continue;
      }
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return map;
  }, [data.match.commentsList]);

  return (
    <Card className='overflow-hidden'>
      <CardContent className='space-y-4 px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6'>
        <div className='flex items-end justify-between gap-3'>
          <div>
            
            <h2 className='mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950'>댓글</h2>
          </div>
          <div className='flex items-center gap-2 text-sm'>
            <button
              type='button'
              className={cn('rounded-full border px-3 py-1.5 font-semibold', sort === 'latest' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600')}
              onClick={() => setSort('latest')}
            >
              최신순
            </button>
            <button
              type='button'
              className={cn('rounded-full border px-3 py-1.5 font-semibold', sort === 'top' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600')}
              onClick={() => setSort('top')}
            >
              추천순
            </button>
          </div>
        </div>

        <div className='rounded-[20px] border border-slate-200 bg-slate-50/70 p-3 sm:p-4'>
          {rootComments.length === 0 ? (
            <div className='ui-empty'>아직 대화가 없습니다.</div>
          ) : (
            <div className='mx-auto max-w-3xl space-y-3'>
              {rootComments.map((comment) => (
                <CommentThread key={comment.id} matchId={data.match.id} comment={comment} replies={repliesByParent.get(comment.id) ?? []} />
              ))}
            </div>
          )}
        </div>

        <div className='sticky bottom-0 z-10 border-t border-slate-200/80 bg-white/95 pt-3 backdrop-blur'>
          <div className='mx-auto max-w-3xl'>
            <CommentInputBar matchId={data.match.id} placeholder='경기 프리뷰 의견을 남겨보세요' />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BottomFixedCta({ state }: { state: DetailState }) {
  if (state !== 'LIVE') {
    return null;
  }

  return (
    <div className='fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6'>
      <div className='mx-auto flex max-w-5xl items-center justify-end'>
        <button type='button' disabled className='ui-action-secondary min-w-[160px] opacity-70'>
          경기 진행 중
        </button>
      </div>
    </div>
  );
}

export function MatchDetailStateView({ data }: { data: MatchDetailData }) {
  const state = resolveDetailState(data.match);

  return (
    <div className='space-y-5 pb-24'>
      <MatchHeader data={data} state={state} />

      {state === 'PRE_MATCH' ? <PreMatchView data={data} /> : null}
      {state === 'LIVE' ? <LiveView data={data} /> : null}
      {state === 'FINISHED' ? <FinishedView data={data} /> : null}

      <CommentsSection data={data} />
      <BottomFixedCta state={state} />
    </div>
  );
}
