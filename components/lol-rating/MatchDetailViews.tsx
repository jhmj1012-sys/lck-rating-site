'use client';

import Link from 'next/link';
import Image from 'next/image';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toBlob } from 'html-to-image';
import { TeamLogo } from './TeamLogo';
import type { MatchData, MatchDetailData } from './types';
import { getTeamDisplayName } from './team-branding';
import { Button, Card, CardContent } from './ui';
import { cn } from './utils';

type DetailState = 'PRE_MATCH' | 'LIVE' | 'FINISHED';
const PREDICTION_JOIN_REWARD_COINS = 10;
const ROLE_ORDER: Array<'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP'> = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const ROLE_META: Record<'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP', { iconPath: string; label: string }> = {
  TOP: { iconPath: '/icons/positions/icon-position-top-disabled.png', label: '탑' },
  JGL: { iconPath: '/icons/positions/icon-position-jungle-disabled.png', label: '정글' },
  MID: { iconPath: '/icons/positions/icon-position-middle-disabled.png', label: '미드' },
  ADC: { iconPath: '/icons/positions/icon-position-bottom-disabled.png', label: '원딜' },
  SUP: { iconPath: '/icons/positions/icon-position-utility-disabled.png', label: '서폿' },
};
const TEAM_CODES = ['T1', 'HLE', 'GEN', 'DK', 'KT', 'BRO', 'NS', 'KRX', 'DNS', 'BFX'] as const;
const TEAM_TOKEN_RE = new RegExp(`\\[(${TEAM_CODES.join('|')})\\]`, 'g');

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
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function LiveBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-transparent text-[#FF5A67]',
        compact ? 'gap-1.5 px-2.5 py-1 text-[11px] font-bold' : 'gap-2 px-3 py-1.5 text-[12px] font-bold',
      )}
    >
      <span className={cn('live-dot rounded-full bg-[#FF4D5E]', compact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
      <span className='tracking-[0.08em]'>LIVE</span>
    </span>
  );
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

function getStatusBadge(state: DetailState) {
  if (state === 'PRE_MATCH') {
    return { label: '예정', variant: 'accent' as const };
  }
  if (state === 'LIVE') {
    return { label: '진행중', variant: 'danger' as const };
  }
  return { label: '종료', variant: 'success' as const };
}

function getRatingChipTone(score: number | null, opponentScore: number | null) {
  if (score === null) {
    return 'bg-[#5C6B82] text-white';
  }
  if (opponentScore === null) {
    return 'bg-[#465774] text-white';
  }
  if (score > opponentScore) {
    return 'bg-[#11294A] text-white';
  }
  if (score < opponentScore) {
    return 'bg-[#6A7D98] text-white';
  }
  return 'bg-[#465774] text-white';
}

function getShareRatingChipColor(score: number | null, opponentScore: number | null) {
  if (score === null) {
    return '#2a2a3a';
  }
  if (opponentScore === null) {
    return '#2a2a3a';
  }
  if (score > opponentScore) {
    return '#4c1d95';
  }
  if (score < opponentScore) {
    return '#1e1e2a';
  }
  return '#2a2a3a';
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

async function postJson<T = Record<string, never>>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? '요청을 처리하지 못했습니다.');
  }
  return payload;
}

async function patchJson<T = Record<string, never>>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? '요청을 처리하지 못했습니다.');
  }
  return payload;
}

async function deleteJson<T = Record<string, never>>(url: string) {
  const response = await fetch(url, {
    method: 'DELETE',
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? '요청을 처리하지 못했습니다.');
  }
  return payload;
}

function MatchHeader({ data, state }: { data: MatchDetailData; state: DetailState }) {
  const status = getStatusBadge(state);
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
      <CardContent className='px-5 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5'>
        <div className='text-center'>
          <div className='flex items-start justify-between gap-3'>
            <div className='text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700'>{data.match.league}</div>
            {state === 'LIVE' ? <LiveBadge compact /> : null}
          </div>
          <div className='mx-auto mt-2 grid max-w-[860px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 rounded-[20px] border border-slate-200 bg-white px-5 py-4 sm:px-8'>
            <div className='text-center'>
              <div className='flex flex-col items-center gap-2'>
                <TeamLogo team={data.match.teamA} size={44} imageClassName='p-2' priority />
                <div className='text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl'>{getTeamDisplayName(data.match.teamA)}</div>
              </div>
            </div>

            <div className='min-w-[180px] text-center'>
              <div className='flex items-center justify-center gap-3'>
                <span className='text-3xl font-black tracking-[-0.03em] text-slate-950'>{scoreA || '\u00A0'}</span>
                <span className={cn('inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-semibold', statusTone)}>
                  {status.label}
                </span>
                <span className='text-3xl font-black tracking-[-0.03em] text-slate-950'>{scoreB || '\u00A0'}</span>
              </div>
              <div className='mt-2 text-sm font-semibold text-slate-600'>{data.match.stage}</div>
            </div>

            <div className='text-center'>
              <div className='flex flex-col items-center gap-2'>
                <TeamLogo team={data.match.teamB} size={44} imageClassName='p-2' priority />
                <div className='text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl'>{getTeamDisplayName(data.match.teamB)}</div>
              </div>
            </div>
          </div>
          <div className='mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600'>
            <span>{formatDateTime(data.match.scheduledAt)}</span>
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
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setNowMs(Date.now());
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
          'flex min-h-[72px] items-center justify-center rounded-[20px] border p-4 text-center transition',
            active
              ? isLeft
              ? 'border-[#2F9FD8] bg-[linear-gradient(180deg,#44AFE4_0%,#2F9FD8_100%)] shadow-none'
              : 'border-[#D84040] bg-[linear-gradient(180deg,#E25656_0%,#D84040_100%)] shadow-none'
            : 'border-slate-200 bg-slate-50 hover:bg-white',
        )}
      >
        <div className='flex flex-col items-center gap-2'>
          <TeamLogo team={team} size={40} imageClassName='p-1.5' />
          <div className='truncate text-2xl font-black text-slate-950'>{getTeamDisplayName(team)}</div>
        </div>
      </button>
    );
  };

  return (
    <section id='prediction-panel' className='space-y-4'>
      <div className='rounded-[22px] border border-slate-200 bg-white p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <div className='text-2xl font-black tracking-[-0.03em] text-slate-950'>승부예측</div>
          <div className='text-xs text-slate-500'>총 {match.predictionSummary.totalVotes.toLocaleString()}명 참여</div>
        </div>

        <div className='grid grid-cols-2 gap-2 sm:gap-3 sm:items-stretch'>
          {renderPickCard(match.teamA)}
          {renderPickCard(match.teamB)}
        </div>

        <div className='mt-4 rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3'>
          <div className='text-center text-[11px] font-semibold tracking-[0.08em] text-slate-500'>승부예측</div>
          <div className='relative mt-2 h-[11px] w-full overflow-hidden rounded-[5px] bg-[#2A2A34]'>
            <div
              className='h-full w-full'
              style={{
                background: `linear-gradient(to right, #2f9fd8 0%, #4fc3e8 ${Math.max(0, Math.min(100, match.predictionSummary.teamA - 15))}%, #9b7dde ${Math.max(0, Math.min(100, match.predictionSummary.teamA))}%, #e84057 ${Math.max(0, Math.min(100, match.predictionSummary.teamA + 15))}%, #c0303f 100%)`,
              }}
            />
          </div>
          <div className='mt-2 flex items-center justify-between text-[12px] font-semibold text-slate-600'>
            <span>{match.predictionSummary.teamA}%</span>
            <span>{match.predictionSummary.teamB}%</span>
          </div>
        </div>
      </div>

      <div className='rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'>
        <div>참여 시 +{PREDICTION_JOIN_REWARD_COINS} 코인 지급</div>
        <div className='mt-1'>
          적중 시 배당에 따라 추가 지급
        </div>
        {estimatedBonusCoins !== null ? (
          <div className='mt-1 text-slate-600'>현재 선택 기준 예상 +{estimatedBonusCoins} 코인</div>
        ) : null}
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
            <div className='flex items-center justify-end gap-3'>
              <TeamLogo team={match.teamA} size={34} imageClassName='p-1.5' />
              <div className='text-right text-lg font-black text-slate-950'>{match.teamA}</div>
            </div>
            <div className='text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>VS</div>
            <div className='flex items-center gap-3'>
              <div className='text-left text-lg font-black text-slate-950'>{match.teamB}</div>
              <TeamLogo team={match.teamB} size={34} imageClassName='p-1.5' />
            </div>
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
            <div className='grid grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)] sm:gap-3'>
              <div className='flex items-center justify-end gap-1 sm:gap-1.5'>
                {Array.from({ length: 5 }).map((_, index) => {
                  const result = preMatchInsights.teamAForm.recent[index] ?? null;
                  return (
                    <span
                      key={`teamA-form-${index}`}
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-black sm:h-7 sm:w-7 sm:rounded-md sm:text-xs',
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
              <div className='text-center text-[10px] font-semibold text-slate-500 sm:text-xs'>최근 5경기</div>
              <div className='flex items-center justify-start gap-1 sm:gap-1.5'>
                {Array.from({ length: 5 }).map((_, index) => {
                  const result = preMatchInsights.teamBForm.recent[index] ?? null;
                  return (
                    <span
                      key={`teamB-form-${index}`}
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-black sm:h-7 sm:w-7 sm:rounded-md sm:text-xs',
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


const SCORE_LABEL_BY_POINT: Record<number, string> = {
  0: '평가 전',
  1: '최악이었어',
  2: '너무 아쉬워',
  3: '기대 이하였다',
  4: '아쉬운 경기',
  5: '무난했어',
  6: '괜찮았어',
  7: '좋았어',
  8: '정말 잘했어',
  9: '압도적이었어',
  10: '완벽한 경기!',
};

function NumberRatingPicker({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (score: number) => void;
}) {
  const selected = value ?? 0;
  const scoreLabel = SCORE_LABEL_BY_POINT[selected] ?? SCORE_LABEL_BY_POINT[0];

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-5 gap-1.5'>
        {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((score) => (
          <button
            key={score}
            type='button'
            disabled={disabled}
            onClick={() => onChange(score)}
            className={cn(
              'flex h-11 items-center justify-center rounded-[10px] text-base font-black transition',
              selected === score
                ? 'bg-[#8B5CF6] text-white shadow-[0_3px_0_#5B21B6]'
                : 'bg-[#52526A] text-white hover:bg-[#5E5E7E]',
              disabled ? 'cursor-not-allowed opacity-40' : '',
            )}
          >
            {score}
          </button>
        ))}
      </div>
      <div className='text-sm font-semibold text-[#9AA6C9]'>{scoreLabel}</div>
    </div>
  );
}

function RatingProgressSummary({ ratedCount, totalCount }: { ratedCount: number; totalCount: number }) {
  const progress = totalCount > 0 ? (ratedCount / totalCount) * 100 : 0;
  return (
    <div className='flex items-center gap-3'>
      <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-[#474756]'>
        <div className='h-full rounded-full bg-[#8B5CF6] transition-[width] duration-300' style={{ width: `${progress}%` }} />
      </div>
      <span className='shrink-0 text-xs font-semibold text-[#d6d6e5]'>{ratedCount}/{totalCount} 완료</span>
    </div>
  );
}

function renderCommentText(text: string): React.ReactNode {
  const parts = text.split(TEAM_TOKEN_RE);
  return parts.map((part, i) =>
    (TEAM_CODES as readonly string[]).includes(part)
      ? <img key={i} src={`/teams/${part}.svg`} alt={part} className='inline h-[1.1em] w-[1.1em] object-contain align-middle' />
      : part,
  );
}

function StartedView({ data, state }: { data: MatchDetailData; state: DetailState }) {
  const isFinished = state === 'FINISHED';
  const router = useRouter();
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [viewerScoreByPlayerId, setViewerScoreByPlayerId] = useState<Record<string, number>>({});
  const [commentByPlayerId, setCommentByPlayerId] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.match.players.map((p) => [p.id, p.viewerComment ?? ''])),
  );
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchSaveError, setBatchSaveError] = useState<string | null>(null);
  const [batchSaveDone, setBatchSaveDone] = useState(false);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [revealedAverageIds, setRevealedAverageIds] = useState<Set<string>>(
    () => new Set(data.match.players.filter((p) => p.viewerScore !== null).map((p) => p.id)),
  );
  const [ratingComments, setRatingComments] = useState(data.match.ratingComments);
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  const [filterPlayer, setFilterPlayer] = useState<string | null>(null);
  const [shareCommentId, setShareCommentId] = useState<string | null>(null);
  const [shareCommentCopied, setShareCommentCopied] = useState(false);
  const shareCommentCardRef = useRef<HTMLDivElement | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    () => new Set(data.match.ratingComments.filter((c) => c.viewerLiked).map((c) => c.id)),
  );
  const canWrite = true;
  const playerById = useMemo(() => new Map(data.match.players.map((player) => [player.id, player])), [data.match.players]);

  const getPlayerByTeamAndRole = (teamCode: string, role: 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP') =>
    data.match.players
      .filter((player) => player.team === teamCode && player.role === role)
      .slice()
      .sort((a, b) => b.ratingCount - a.ratingCount)[0] ?? null;

  const orderedSelectablePlayers = useMemo(() => {
    const seen = new Set<string>();
    const ordered: MatchDetailData['match']['players'] = [];
    for (const role of ROLE_ORDER) {
      const left = getPlayerByTeamAndRole(data.match.teamA, role);
      const right = getPlayerByTeamAndRole(data.match.teamB, role);
      if (left && !seen.has(left.id)) {
        seen.add(left.id);
        ordered.push(left);
      }
      if (right && !seen.has(right.id)) {
        seen.add(right.id);
        ordered.push(right);
      }
    }
    return ordered;
  }, [data.match.teamA, data.match.teamB, data.match.players]);
  const ratedCount = orderedSelectablePlayers.filter(
    (player) => (viewerScoreByPlayerId[player.id] ?? player.viewerScore ?? null) !== null,
  ).length;

  useEffect(() => {
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
    if (selectedPlayerId && playerById.has(selectedPlayerId)) {
      return;
    }
    setSelectedPlayerId(orderedSelectablePlayers[0]?.id ?? null);
  }, [orderedSelectablePlayers, playerById, selectedPlayerId]);

  const saveAllRatings = async () => {
    if (!canWrite || isBatchSaving) return;
    const toSave = orderedSelectablePlayers.filter((p) => viewerScoreByPlayerId[p.id] !== undefined);
    if (toSave.length === 0) return;
    try {
      setBatchSaveError(null);
      setIsBatchSaving(true);
      let earned = 0;
      for (const p of toSave) {
        const res = await postJson<{ ratingComment: import('./types').MatchRatingComment | null; coinsEarned: number }>(`/api/matches/${data.match.id}/ratings`, {
          playerId: p.id,
          score: viewerScoreByPlayerId[p.id],
          comment: (commentByPlayerId[p.id] ?? '').trim(),
        });
        earned += res.coinsEarned ?? 0;
        if (res.ratingComment) {
          const incoming = res.ratingComment;
          setRatingComments((prev) => {
            const idx = prev.findIndex((c) => c.id === incoming.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = incoming;
              return next;
            }
            return [incoming, ...prev];
          });
        }
      }
      setRevealedAverageIds((prev) => new Set([...prev, ...toSave.map((p) => p.id)]));
      setTotalCoinsEarned(earned);
      setBatchSaveDone(true);
      window.setTimeout(() => { setBatchSaveDone(false); setTotalCoinsEarned(0); }, 3000);
      startTransition(() => router.refresh());
    } catch (error) {
      setBatchSaveError(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const toggleLike = async (commentId: string) => {
    const isLiked = likedCommentIds.has(commentId);
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    setRatingComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, likeCount: c.likeCount + (isLiked ? -1 : 1), viewerLiked: !isLiked }
          : c,
      ),
    );
    try {
      await postJson(`/api/matches/${data.match.id}/rating-comments/${commentId}/like`, {});
    } catch {
      setLikedCommentIds((prev) => {
        const next = new Set(prev);
        isLiked ? next.add(commentId) : next.delete(commentId);
        return next;
      });
      setRatingComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likeCount: c.likeCount + (isLiked ? 1 : -1), viewerLiked: isLiked }
            : c,
        ),
      );
    }
  };

  const makeBlobFromElement = (el: HTMLDivElement, borderRadius: string) => {
    const rect = el.getBoundingClientRect();
    return toBlob(el, {
      cacheBust: true,
      pixelRatio: Math.max(2, window.devicePixelRatio || 1),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      fetchRequestInit: { cache: 'no-store' },
      style: { margin: '0', transform: 'none', borderRadius, overflow: 'hidden' },
    }).then((b) => b ?? new Blob([], { type: 'image/png' }));
  };

  const copyShareCardImage = async () => {
    const cardElement = shareCardRef.current;
    if (!cardElement || !navigator.clipboard || typeof window.ClipboardItem === 'undefined') return;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    }
    const blobPromise = makeBlobFromElement(cardElement, '22px');
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blobPromise })]);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1200);
  };

  const copyCommentShareImage = async () => {
    const el = shareCommentCardRef.current;
    if (!el || !navigator.clipboard || typeof window.ClipboardItem === 'undefined') return;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    }
    const blobPromise = makeBlobFromElement(el, '18px');
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blobPromise })]);
    setShareCommentCopied(true);
    window.setTimeout(() => setShareCommentCopied(false), 1200);
  };

  const shareComment = shareCommentId ? ratingComments.find((c) => c.id === shareCommentId) ?? null : null;

  const finishedCards = isFinished ? (
    <>
      <Card>
        <CardContent className='space-y-3 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
          <div className='text-2xl font-black tracking-[-0.03em] text-slate-950'>내 예측 결과</div>
          <div className='grid grid-cols-3 gap-2 sm:gap-3'>
            <div className='rounded-[14px] border border-slate-200 bg-slate-50 px-2 py-2 sm:px-4 sm:py-3'>
              <div className='text-[11px] text-slate-500 sm:text-xs'>선택 팀</div>
              <div className='mt-1 text-sm font-black text-slate-950 sm:text-lg'>{data.match.myPredictionTeam ?? '미참여'}</div>
            </div>
            <div className='rounded-[14px] border border-slate-200 bg-slate-50 px-2 py-2 sm:px-4 sm:py-3'>
              <div className='text-[11px] text-slate-500 sm:text-xs'>결과</div>
              <div className='mt-1 text-sm font-black text-slate-950 sm:text-lg'>
                {data.match.myPredictionSettlementResult === 'hit' ? '적중' : data.match.myPredictionSettlementResult === 'miss' ? '실패' : '대기'}
              </div>
            </div>
            <div className='rounded-[14px] border border-slate-200 bg-slate-50 px-2 py-2 sm:px-4 sm:py-3'>
              <div className='text-[11px] text-slate-500 sm:text-xs'>보상</div>
              <div className='mt-1 text-sm font-black text-slate-950 sm:text-lg'>+{data.match.myPredictionSettlementCoins}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  ) : null;

  const selPlayer = selectedPlayerId !== null ? playerById.get(selectedPlayerId) ?? null : null;
  const selDraftScore = selPlayer ? (viewerScoreByPlayerId[selPlayer.id] ?? selPlayer.viewerScore ?? null) : null;
  const selShowAverage = selPlayer ? revealedAverageIds.has(selPlayer.id) : false;
  const newlyRatedCount = orderedSelectablePlayers.filter((p) => viewerScoreByPlayerId[p.id] !== undefined).length;

  return (
    <div className='space-y-5'>
      <div className='overflow-hidden rounded-[24px] bg-[#31313C] shadow-[0_14px_36px_rgba(2,6,23,0.28)]'>
        <div className='space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5'>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-xl font-black tracking-[-0.03em] text-white'>선수 평점</h2>
            {isFinished && (
              <button
                type='button'
                onClick={() => setShowShareCard(true)}
                className='inline-flex items-center gap-1.5 rounded-full bg-[#3A3A47] px-3 py-1.5 text-[11px] font-semibold !text-white transition hover:bg-[#474756]'
              >
                📤 공유 카드
              </button>
            )}
          </div>

          <RatingProgressSummary ratedCount={ratedCount} totalCount={orderedSelectablePlayers.length} />

          {/* 코인 보상 안내 */}
          {isFinished && (() => {
            const total = orderedSelectablePlayers.length;
            const pct = total > 0 ? Math.min(100, (ratedCount / total) * 100) : 0;
            const isComplete = ratedCount >= total;
            return (
              <div className='rounded-[14px] bg-[#27272E] p-3'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-sm'>🪙</span>
                  <span className='text-[11px] font-bold text-[#A78BFA]'>평점 참여 보상</span>
                </div>
                <div className='mt-2 flex flex-wrap gap-1.5'>
                  <span className='inline-flex items-center gap-1 rounded-full bg-[#3A3A47] px-2 py-0.5 text-[10px] font-semibold text-[#d6d6e5]'>
                    선수당 <span className='text-[#A78BFA]'>+4코인</span>
                  </span>
                  <span className='inline-flex items-center gap-1 rounded-full bg-[#3A3A47] px-2 py-0.5 text-[10px] font-semibold text-[#d6d6e5]'>
                    코멘트 <span className='text-[#A78BFA]'>+1코인</span>
                  </span>
                  <span className='inline-flex items-center gap-1 rounded-full bg-[#3A3A47] px-2 py-0.5 text-[10px] font-semibold text-[#d6d6e5]'>
                    10명 완주 <span className='text-yellow-400'>+20코인</span>
                  </span>
                </div>
                <div className='mt-2.5'>
                  <div className='mb-1 flex items-center justify-between text-[10px]'>
                    <span className='text-[#6B6B80]'>{ratedCount}/{total} 평가 완료</span>
                    {isComplete
                      ? <span className='font-bold text-[#A78BFA]'>🎉 완주 보너스 획득!</span>
                      : <span className='text-[#6B6B80]'>완주까지 {total - ratedCount}명 남음</span>
                    }
                  </div>
                  <div className='h-1.5 overflow-hidden rounded-full bg-[#474756]'>
                    <div
                      className='h-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] transition-all duration-500'
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 5-row role grid */}
          <div className='overflow-hidden rounded-[16px] border border-[#474756]'>
            <div className='grid grid-cols-[1fr_36px_1fr] bg-[#3A3A47] px-3 py-2'>
              <div className='text-[11px] font-semibold text-[#d6d6e5]'>{getTeamDisplayName(data.match.teamA)}</div>
              <div />
              <div className='text-right text-[11px] font-semibold text-[#d6d6e5]'>{getTeamDisplayName(data.match.teamB)}</div>
            </div>
            {ROLE_ORDER.map((role) => {
              const left = getPlayerByTeamAndRole(data.match.teamA, role);
              const right = getPlayerByTeamAndRole(data.match.teamB, role);
              const leftScore = left ? (viewerScoreByPlayerId[left.id] ?? left.viewerScore ?? null) : null;
              const rightScore = right ? (viewerScoreByPlayerId[right.id] ?? right.viewerScore ?? null) : null;
              return (
                <div key={role} className='grid grid-cols-[1fr_36px_1fr] items-stretch border-t border-[#474756]'>
                  {left ? (
                    <button
                      type='button'
                      onClick={() => setSelectedPlayerId(left.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 text-left transition',
                        selectedPlayerId === left.id ? 'bg-[#8B5CF6]/20' : 'hover:bg-[#3A3A47]',
                      )}
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-sm font-bold text-white'>{left.name}</div>
                      </div>
                      <div className='shrink-0 text-right'>
                        {left.ratingCount > 0 && <span className='text-xs font-black text-[#A78BFA]'>{left.rating.toFixed(1)}</span>}
                        {leftScore !== null && <span className='ml-1 text-[10px] text-[#6B6B80]'>(나 {leftScore.toFixed(1)})</span>}
                      </div>
                    </button>
                  ) : <div className='px-3 py-3 text-sm text-[#7E89A8]'>-</div>}
                  <div className='flex items-center justify-center border-x border-[#474756]'>
                    <Image src={ROLE_META[role].iconPath} alt={ROLE_META[role].label} width={18} height={18} className='h-[18px] w-[18px] object-contain brightness-125' />
                  </div>
                  {right ? (
                    <button
                      type='button'
                      onClick={() => setSelectedPlayerId(right.id)}
                      className={cn(
                        'flex items-center justify-end gap-2 px-3 py-2.5 text-right transition',
                        selectedPlayerId === right.id ? 'bg-[#8B5CF6]/20' : 'hover:bg-[#3A3A47]',
                      )}
                    >
                      <div className='shrink-0 text-left'>
                        {right.ratingCount > 0 && <span className='text-xs font-black text-[#A78BFA]'>{right.rating.toFixed(1)}</span>}
                        {rightScore !== null && <span className='ml-1 text-[10px] text-[#6B6B80]'>(나 {rightScore.toFixed(1)})</span>}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-sm font-bold text-white'>{right.name}</div>
                      </div>
                    </button>
                  ) : <div className='px-3 py-3 text-right text-sm text-[#7E89A8]'>-</div>}
                </div>
              );
            })}
          </div>

          {/* Selected player rating panel */}
          {selPlayer !== null ? (
            <div className='space-y-3 rounded-[16px] bg-[#3A3A47] p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='text-[11px] text-[#9AA6C9]'>{getTeamDisplayName(selPlayer.team)} · {ROLE_META[selPlayer.role].label}</div>
                  <div className='mt-0.5 text-lg font-black tracking-[-0.02em] text-white'>{selPlayer.name}</div>
                </div>
                {selShowAverage ? (
                  <div className='shrink-0 text-right'>
                    <div className='text-[11px] text-[#9AA6C9]'>평균 평점</div>
                    <div className='text-xl font-black text-white'>{selPlayer.rating.toFixed(1)}</div>
                    <div className='text-[11px] text-[#9AA6C9]'>{selPlayer.ratingCount}명</div>
                  </div>
                ) : null}
              </div>
              <div className='text-xs font-semibold text-[#9AA6C9]'>
                {selDraftScore !== null ? `${selDraftScore.toFixed(1)}점 선택됨` : '점수를 선택해 주세요'}
              </div>
              <NumberRatingPicker
                value={selDraftScore}
                disabled={!canWrite || isBatchSaving}
                onChange={(score) => {
                  setViewerScoreByPlayerId((prev) => ({ ...prev, [selPlayer.id]: score }));
                }}
              />
              {/* 한 줄 코멘트 */}
              <div className='space-y-1.5'>
                <div className='relative'>
                  <input
                    type='text'
                    value={commentByPlayerId[selPlayer.id] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 50);
                      setCommentByPlayerId((prev) => ({ ...prev, [selPlayer.id]: val }));
                    }}
                    placeholder='한 줄 코멘트 남기기... (선택, 50자)'
                    disabled={isBatchSaving}
                    className='w-full rounded-[10px] border border-[#474756] bg-[#27272E] px-3 py-2.5 pr-12 text-sm text-white outline-none transition placeholder:text-[#6B6B80] focus:border-[#8B5CF6]'
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#6B6B80]'>
                    {(commentByPlayerId[selPlayer.id] ?? '').length}/50
                  </span>
                </div>
                <div className='grid grid-cols-10 gap-2'>
                  {(['😭', '😤', '🤣', '😱', '🥺', '🤩', '😮', '🤬', '😴', '🥶'] as const).map((emoji) => (
                    <button
                      key={emoji}
                      type='button'
                      disabled={isBatchSaving}
                      onClick={() => {
                        setCommentByPlayerId((prev) => {
                          const cur = prev[selPlayer.id] ?? '';
                          if (cur.length >= 50) return prev;
                          return { ...prev, [selPlayer.id]: (cur + emoji).slice(0, 50) };
                        });
                      }}
                      className='flex aspect-square w-full items-center justify-center rounded-[10px] bg-[#31313C] text-3xl transition hover:bg-[#474756] active:scale-90 disabled:opacity-40'
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className='grid grid-cols-10 gap-2'>
                  {TEAM_CODES.map((team) => (
                    <button
                      key={team}
                      type='button'
                      disabled={isBatchSaving}
                      onClick={() => {
                        setCommentByPlayerId((prev) => {
                          const cur = prev[selPlayer.id] ?? '';
                          const token = `[${team}]`;
                          if (cur.length + token.length > 50) return prev;
                          return { ...prev, [selPlayer.id]: (cur + token).slice(0, 50) };
                        });
                      }}
                      className='flex aspect-square w-full items-center justify-center rounded-[10px] bg-[#31313C] transition hover:bg-[#474756] active:scale-90 disabled:opacity-40'
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/teams/${team}.svg`} alt={team} className='h-[1.875rem] w-[1.875rem] object-contain' />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Batch save */}
          <div className='space-y-2 pt-1'>
            {batchSaveError ? (
              <div className='rounded-[12px] border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200'>
                {batchSaveError}
              </div>
            ) : null}
            <button
              type='button'
              disabled={isBatchSaving || newlyRatedCount === 0}
              onClick={saveAllRatings}
              className='inline-flex w-full min-h-[48px] items-center justify-center rounded-[14px] border border-[#5B21B6] bg-[#7C3AED] px-5 text-sm font-semibold !text-white shadow-[0_4px_0_#5B21B6] transition-all hover:translate-y-[2px] hover:shadow-[0_2px_0_#5B21B6] disabled:cursor-not-allowed disabled:border-[#474756] disabled:bg-[#3A3A47] disabled:shadow-none disabled:text-[#9AA6C9]'
            >
              {isBatchSaving
                ? '저장 중...'
                : batchSaveDone
                  ? `저장 완료 ✓${totalCoinsEarned > 0 ? `  🪙 +${totalCoinsEarned}코인` : ''}`
                  : newlyRatedCount > 0
                    ? `${newlyRatedCount}명 평점 저장하기`
                    : '점수를 먼저 선택해 주세요'}
            </button>
          </div>
        </div>
      </div>

      {/* 반응 피드 */}
      <div className='overflow-hidden rounded-[24px] bg-[#31313C] shadow-[0_14px_36px_rgba(2,6,23,0.28)]'>
        <div className='border-b border-[#474756] px-4 py-3 sm:px-5'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='text-base font-black tracking-[-0.02em] text-white'>반응 피드</h3>
            <span className='text-xs font-semibold text-[#9AA6C9]'>{ratingComments.length > 0 ? `${ratingComments.length}개` : ''}</span>
          </div>
          {ratingComments.length > 0 && (() => {
            const commentedPlayerNames = new Set(ratingComments.map((c) => c.playerName));
            const activePlayers = data.match.players.filter((p) => commentedPlayerNames.has(p.name));
            const teams = [...new Set(activePlayers.map((p) => p.team))];
            const teamPlayers = filterTeam ? activePlayers.filter((p) => p.team === filterTeam) : [];
            const pillCls = (active: boolean) => cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition', active ? 'bg-[#8B5CF6] text-white' : 'bg-[#3A3A47] !text-[#9AA6C9] hover:bg-[#474756]');
            return (
              <div className='mt-2.5 space-y-1.5'>
                <div className='flex gap-1.5'>
                  <button type='button' onClick={() => { setFilterTeam(null); setFilterPlayer(null); }} className={pillCls(filterTeam === null)}>전체</button>
                  {teams.map((t) => (
                    <button key={t} type='button' onClick={() => { setFilterTeam(t); setFilterPlayer(null); }} className={pillCls(filterTeam === t)}>{t}</button>
                  ))}
                </div>
                {filterTeam && (
                  <div className='flex flex-wrap gap-1.5'>
                    <button type='button' onClick={() => setFilterPlayer(null)} className={pillCls(filterPlayer === null)}>전체</button>
                    {teamPlayers.map((p) => (
                      <button key={p.id} type='button' onClick={() => setFilterPlayer(p.name)} className={pillCls(filterPlayer === p.name)}>{p.name}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <div className='divide-y divide-[#474756] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#474756] [&::-webkit-scrollbar-thumb:hover]:bg-[#6B6B80]' style={{ maxHeight: 400 }}>
          {ratingComments.length === 0 ? (
            <div className='px-4 py-8 text-center'>
              <div className='text-2xl'>💬</div>
              <div className='mt-2 text-sm font-semibold text-[#9AA6C9]'>아직 코멘트가 없어요</div>
              <div className='mt-1 text-xs text-[#6B6B80]'>평점 저장 시 한 줄 코멘트를 남겨보세요</div>
            </div>
          ) : (
            ratingComments.filter((c) => (filterTeam === null || c.team === filterTeam) && (filterPlayer === null || c.playerName === filterPlayer)).map((c) => {
              const liked = likedCommentIds.has(c.id);
              return (
                <div key={c.id} className='flex items-start gap-3 px-4 py-3 sm:px-5'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span className='inline-flex items-center rounded-full bg-[#3A3A47] px-2 py-0.5 text-[11px] font-semibold text-[#d6d6e5]'>
                        {c.team} {c.playerName}
                      </span>
                      <span className='text-[11px] font-black text-[#A78BFA]'>{c.score.toFixed(1)}점</span>
                      <span className='text-[11px] text-[#6B6B80]'>{c.user}</span>
                    </div>
                    <p className='mt-1 text-sm leading-snug text-white'>{renderCommentText(c.text)}</p>
                  </div>
                  <div className='mt-0.5 shrink-0 flex items-center gap-1'>
                    <button
                      type='button'
                      onClick={() => setShareCommentId(c.id)}
                      className='flex h-7 w-7 items-center justify-center rounded-full bg-[#3A3A47] text-[11px] !text-white transition hover:bg-[#474756]'
                      title='퍼가기'
                    >
                      <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-3.5 w-3.5'><path d='M15 7l-5-4-5 4' /><path d='M10 3v10' /><path d='M4 13v3h12v-3' /></svg>
                    </button>
                    <button
                      type='button'
                      onClick={() => toggleLike(c.id)}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition',
                        liked
                          ? 'bg-[#8B5CF6]/20 text-[#C4B5FD]'
                          : 'bg-[#3A3A47] !text-white hover:bg-[#474756]',
                      )}
                    >
                      👍{c.likeCount > 0 ? <span>{c.likeCount}</span> : null}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {finishedCards}


      {/* 공유 카드 모달 */}
      {showShareCard && (() => {
        const [scoreA, scoreB] = data.match.score.split(' : ').map(Number);
        const teamAWon = scoreA > scoreB;
        const teamBWon = scoreB > scoreA;
        const mvpCandidate = data.match.players.reduce<typeof data.match.players[0] | null>((best, p) => (!best || p.rating > best.rating ? p : best), null);
        const mvp = mvpCandidate && mvpCandidate.rating > 0 ? mvpCandidate : null;
        return (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm' onClick={() => setShowShareCard(false)}>
            <div className='mx-4 w-full max-w-[392px]' onClick={(e) => e.stopPropagation()}>
              <div data-share-card='true' ref={shareCardRef} className='relative mx-auto w-full overflow-hidden rounded-[22px] border border-[#2a2a3a] text-white' style={{ background: 'linear-gradient(145deg, #12121a 0%, #1a1230 50%, #0e1a2e 100%)' }}>
                <div className='absolute inset-0 pointer-events-none' style={{ background: 'radial-gradient(ellipse at top right, rgba(124,58,237,0.18) 0%, transparent 60%)' }} />
                <div className='relative p-5'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='inline-flex min-w-0 items-center gap-2'>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src='/logo.svg' alt='LPR' className='h-8 w-8' />
                      <span className='text-xs font-bold text-slate-100'>LOL PRO RATING</span>
                    </div>
                    <div className='shrink-0 text-right text-[10px] text-slate-400'>{formatDateTime(data.match.scheduledAt)}</div>
                  </div>
                  <div className='mt-3 text-center text-[10px] font-semibold tracking-[0.18em] text-[#A78BFA]'>{data.match.league}</div>
                  <div className='mt-0.5 truncate text-center text-[11px] font-semibold text-slate-300'>{data.match.stage}</div>
                  <div className='mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
                    <div className='flex flex-col items-center gap-1.5'>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/teams/${data.match.teamA}.svg`} alt={data.match.teamA} className='h-10 w-10 object-contain' onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className={cn('text-sm font-black', teamAWon ? 'text-white' : 'text-slate-400')}>{data.match.teamA}</span>
                    </div>
                    <div className='text-center'>
                      <div className='text-[28px] font-black tracking-[-0.03em]'>
                        <span className={teamAWon ? 'text-white' : 'text-slate-500'}>{scoreA}</span>
                        <span className='text-slate-500 mx-1'>-</span>
                        <span className={teamBWon ? 'text-white' : 'text-slate-500'}>{scoreB}</span>
                      </div>
                    </div>
                    <div className='flex flex-col items-center gap-1.5'>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/teams/${data.match.teamB}.svg`} alt={data.match.teamB} className='h-10 w-10 object-contain' onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className={cn('text-sm font-black', teamBWon ? 'text-white' : 'text-slate-400')}>{data.match.teamB}</span>
                    </div>
                  </div>
                  <div className='mt-4 rounded-[14px] border border-white/10 bg-white/5 p-2.5'>
                    <div className='space-y-2.5'>
                      {ROLE_ORDER.map((role) => {
                        const left = getPlayerByTeamAndRole(data.match.teamA, role);
                        const right = getPlayerByTeamAndRole(data.match.teamB, role);
                        const leftRating = left ? Number(left.rating.toFixed(1)) : null;
                        const rightRating = right ? Number(right.rating.toFixed(1)) : null;
                        const leftIsMvp = mvp && left?.id === mvp.id;
                        const rightIsMvp = mvp && right?.id === mvp.id;
                        return (
                          <div key={`share_${role}`} className='grid grid-cols-[minmax(0,1fr)_40px_24px_40px_minmax(0,1fr)] items-center gap-1'>
                            <div className={cn('truncate pl-1 text-left text-[11px] font-semibold', leftIsMvp ? 'text-[#F59E0B]' : 'text-slate-100')}>
                              {leftIsMvp && <span className='mr-1'>👑</span>}{left?.name ?? '-'}
                            </div>
                            <div className='flex justify-end'>
                              <div className='rounded-md px-1.5 py-[2px] text-[10px] font-semibold text-white' style={{ backgroundColor: getShareRatingChipColor(leftRating, rightRating) }}>
                                {leftRating !== null ? leftRating.toFixed(1) : '-'}
                              </div>
                            </div>
                            <div className='flex w-6 items-center justify-center'>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={ROLE_META[role].iconPath} alt={ROLE_META[role].label} width={16} height={16} className='h-4 w-4 object-contain' />
                            </div>
                            <div className='flex justify-start'>
                              <div className='rounded-md px-1.5 py-[2px] text-[10px] font-semibold text-white' style={{ backgroundColor: getShareRatingChipColor(rightRating, leftRating) }}>
                                {rightRating !== null ? rightRating.toFixed(1) : '-'}
                              </div>
                            </div>
                            <div className={cn('truncate pr-1 text-right text-[11px] font-semibold', rightIsMvp ? 'text-[#F59E0B]' : 'text-slate-100')}>
                              {right?.name ?? '-'}{rightIsMvp && <span className='ml-1'>👑</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className='mt-3 flex gap-2'>
                <button type='button' onClick={copyShareCardImage} className='flex-1 rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-bold text-white transition hover:bg-[#7C3AED]'>
                  {shareCopied ? '복사됨!' : '이미지 복사'}
                </button>
                <button type='button' onClick={() => setShowShareCard(false)} className='rounded-xl bg-[#3A3A47] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#474756]'>
                  닫기
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 코멘트 퍼가기 모달 */}
      {shareComment && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm' onClick={() => setShareCommentId(null)}>
          <div className='mx-4 w-full max-w-[360px]' onClick={(e) => e.stopPropagation()}>
            <div ref={shareCommentCardRef} className='overflow-hidden rounded-[18px] bg-[#1C1C1F] text-white'>
              <div className='p-5'>
                {/* 헤더: 로고 + 리그 */}
                <div className='flex items-center justify-between gap-3'>
                  <div className='inline-flex items-center gap-2'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src='/logo.svg' alt='LPR' className='h-7 w-7' />
                    <span className='text-[11px] font-bold text-slate-400'>LOL PRO RATING</span>
                  </div>
                  <span className='text-[10px] text-slate-500'>{data.match.league} · {data.match.teamA} vs {data.match.teamB}</span>
                </div>

                {/* 선수명 크게 */}
                <div className='mt-4'>
                  <div className='text-[11px] font-semibold text-[#A78BFA]'>{shareComment.team}</div>
                  <div className='text-2xl font-black tracking-[-0.02em]'>{shareComment.playerName}</div>
                </div>

                {/* 코멘트 본문 */}
                <div className='mt-4 rounded-[14px] bg-[#2a2a36] px-4 py-4'>
                  <p className='text-[15px] font-semibold leading-relaxed text-white'>{renderCommentText(shareComment.text)}</p>
                  <div className='mt-3 flex items-center justify-between'>
                    <div>
                      <span className='text-[11px] text-[#6B6B80]'>— {shareComment.user}</span>
                      <span className='ml-2 text-[11px] text-[#6B6B80]'>{shareComment.score.toFixed(1)}점</span>
                    </div>
                    {shareComment.likeCount > 0 && (
                      <span className='text-[11px] text-[#A78BFA] font-semibold'>👍 {shareComment.likeCount}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼들 */}
            <div className='mt-3 flex gap-2'>
              <button
                type='button'
                onClick={copyCommentShareImage}
                className='flex-1 rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-bold text-white transition hover:bg-[#7C3AED]'
              >
                {shareCommentCopied ? '복사됨!' : '이미지 복사'}
              </button>
              <button
                type='button'
                onClick={() => setShareCommentId(null)}
                className='rounded-xl bg-[#3A3A47] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#474756]'
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function BottomFixedCta({ state }: { state: DetailState }) {
  return null;
}

export function MatchDetailStateView({ data }: { data: MatchDetailData }) {
  const state = resolveDetailState(data.match);

  return (
    <div className='space-y-5 pb-24'>
      <MatchHeader data={data} state={state} />

      {state === 'PRE_MATCH' ? <PreMatchView data={data} /> : null}
      {state === 'LIVE' || state === 'FINISHED' ? <StartedView data={data} state={state} /> : null}

      <BottomFixedCta state={state} />
    </div>
  );
}
