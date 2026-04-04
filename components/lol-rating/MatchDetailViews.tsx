'use client';

import Link from 'next/link';
import Image from 'next/image';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toBlob } from 'html-to-image';
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH } from '@/lib/comment-constants';

import { TeamLogo } from './TeamLogo';
import type { MatchComment, MatchData, MatchDetailData } from './types';
import { getTeamDisplayName } from './team-branding';
import { Avatar, Button, Card, CardContent } from './ui';
import { cn, getInitials } from './utils';

type DetailState = 'PRE_MATCH' | 'LIVE' | 'FINISHED';
type CommentSort = 'latest' | 'top';
type MatchDetailViewer = {
  id: string | null;
  nickname?: string | null;
  name?: string | null;
  hasNickname?: boolean | null;
};
const PREDICTION_JOIN_REWARD_COINS = 10;
const ROLE_ORDER: Array<'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP'> = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const ROLE_META: Record<'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP', { iconPath: string; label: string }> = {
  TOP: { iconPath: '/icons/positions/icon-position-top-disabled.png', label: '탑' },
  JGL: { iconPath: '/icons/positions/icon-position-jungle-disabled.png', label: '정글' },
  MID: { iconPath: '/icons/positions/icon-position-middle-disabled.png', label: '미드' },
  ADC: { iconPath: '/icons/positions/icon-position-bottom-disabled.png', label: '원딜' },
  SUP: { iconPath: '/icons/positions/icon-position-utility-disabled.png', label: '서폿' },
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
    return '#5C6B82';
  }
  if (opponentScore === null) {
    return '#465774';
  }
  if (score > opponentScore) {
    return '#11294A';
  }
  if (score < opponentScore) {
    return '#6A7D98';
  }
  return '#465774';
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
                        <Link href={`/player/${left.playerSlug}`} className='hover:text-sky-700 hover:underline'>
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
                        <Link href={`/player/${right.playerSlug}`} className='hover:text-sky-700 hover:underline'>
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

function StartedView({ data, state }: { data: MatchDetailData; state: DetailState }) {
  const isFinished = state === 'FINISHED';
  const [shareCopied, setShareCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [viewerScoreByPlayerId, setViewerScoreByPlayerId] = useState<Record<string, number>>({});
  const [commentByPlayerId, setCommentByPlayerId] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.match.players.map((p) => [p.id, p.viewerComment ?? ''])),
  );
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchSaveError, setBatchSaveError] = useState<string | null>(null);
  const [batchSaveDone, setBatchSaveDone] = useState(false);
  const [revealedAverageIds, setRevealedAverageIds] = useState<Set<string>>(
    () => new Set(data.match.players.filter((p) => p.viewerScore !== null).map((p) => p.id)),
  );
  const [ratingComments, setRatingComments] = useState(data.match.ratingComments);
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
      await Promise.all(
        toSave.map((p) =>
          postJson(`/api/matches/${data.match.id}/ratings`, {
            playerId: p.id,
            score: viewerScoreByPlayerId[p.id],
            comment: (commentByPlayerId[p.id] ?? '').trim(),
          }),
        ),
      );
      setRevealedAverageIds((prev) => new Set([...prev, ...toSave.map((p) => p.id)]));
      setBatchSaveDone(true);
      window.setTimeout(() => setBatchSaveDone(false), 2000);
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
          </div>

          <RatingProgressSummary ratedCount={ratedCount} totalCount={orderedSelectablePlayers.length} />

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
                      {leftScore !== null && (
                        <span className='shrink-0 text-xs font-black text-[#A78BFA]'>{leftScore.toFixed(1)}</span>
                      )}
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
                      {rightScore !== null && (
                        <span className='shrink-0 text-xs font-black text-[#A78BFA]'>{rightScore.toFixed(1)}</span>
                      )}
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
                <div className='grid grid-cols-5 gap-2'>
                  {(['😭', '😤', '🤣', '😱', '🥹', '🤩', '😮', '🤬', '😴', '🥶'] as const).map((emoji) => (
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
                      className='flex h-[60px] w-full items-center justify-center rounded-[10px] bg-[#31313C] text-3xl transition hover:bg-[#474756] active:scale-90 disabled:opacity-40'
                    >
                      {emoji}
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
              className='inline-flex w-full min-h-[48px] items-center justify-center rounded-[14px] border border-[#5B21B6] bg-[#7C3AED] px-5 text-sm font-semibold text-white shadow-[0_4px_0_#5B21B6] transition-all hover:translate-y-[2px] hover:shadow-[0_2px_0_#5B21B6] disabled:cursor-not-allowed disabled:border-[#474756] disabled:bg-[#3A3A47] disabled:shadow-none disabled:text-[#9AA6C9]'
            >
              {isBatchSaving
                ? '저장 중...'
                : batchSaveDone
                  ? '저장 완료 ✓'
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
        </div>
        <div className='divide-y divide-[#474756]'>
          {ratingComments.length === 0 ? (
            <div className='px-4 py-8 text-center'>
              <div className='text-2xl'>💬</div>
              <div className='mt-2 text-sm font-semibold text-[#9AA6C9]'>아직 코멘트가 없어요</div>
              <div className='mt-1 text-xs text-[#6B6B80]'>평점 저장 시 한 줄 코멘트를 남겨보세요</div>
            </div>
          ) : (
            ratingComments.map((c) => {
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
                    <p className='mt-1 text-sm leading-snug text-white'>{c.text}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => toggleLike(c.id)}
                    className={cn(
                      'mt-0.5 shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition',
                      liked
                        ? 'bg-[#8B5CF6]/20 text-[#C4B5FD]'
                        : 'bg-[#3A3A47] text-[#9AA6C9] hover:bg-[#474756] hover:text-white',
                    )}
                  >
                    👍{c.likeCount > 0 ? <span>{c.likeCount}</span> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {finishedCards}

      {isFinished && <Card>
        <CardContent className='space-y-3 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
          <div className='flex items-center justify-between gap-3'>
            <div className='text-2xl font-black tracking-[-0.03em] text-slate-950'>공유 카드</div>
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
          <div data-share-card='true' ref={shareCardRef} className='mx-auto w-full max-w-[392px] aspect-[4/5] overflow-hidden rounded-[22px] border border-slate-200 bg-[#1C1C1F] p-3.5 text-white sm:p-5'>
            <div className='flex items-center justify-between gap-3'>
              <div className='inline-flex min-w-0 items-center gap-2'>
                <span className='inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#7C3AED] text-[11px] font-black tracking-[-0.03em] text-white sm:h-9 sm:w-9 sm:text-xs'>LPR</span>
                <span className='truncate text-xs font-bold text-slate-100 sm:text-sm'>LOL PRO RATING</span>
              </div>
              <div className='shrink-0 text-right text-[10px] text-slate-300 sm:text-[11px]'>{formatDateTime(data.match.scheduledAt)}</div>
            </div>
            <div className='mt-2 text-center text-[11px] font-semibold tracking-[0.14em] text-slate-300 sm:mt-3 sm:text-xs sm:tracking-[0.16em]'>{data.match.league}</div>
            <div className='mt-1 truncate text-center text-xs font-semibold text-slate-200 sm:text-sm'>{data.match.stage}</div>
            <div className='mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
              <div className='truncate text-center text-base font-black sm:text-lg'>{data.match.teamA}</div>
              <div className='text-center text-[28px] font-black tracking-[-0.03em] sm:text-4xl'>{data.match.score.replace(' : ', ' - ')}</div>
              <div className='truncate text-center text-base font-black sm:text-lg'>{data.match.teamB}</div>
            </div>
            <div className='mt-5 rounded-[14px] border border-white/20 bg-[#353544] p-2.5 sm:mt-7 sm:p-3.5'>
              <div className='space-y-3.5 sm:space-y-5'>
                {ROLE_ORDER.map((role) => {
                  const left = getPlayerByTeamAndRole(data.match.teamA, role);
                  const right = getPlayerByTeamAndRole(data.match.teamB, role);
                  const leftRating = left ? Number(left.rating.toFixed(1)) : null;
                  const rightRating = right ? Number(right.rating.toFixed(1)) : null;

                  return (
                    <div key={`share_${role}`} className='grid grid-cols-[minmax(0,1fr)_40px_24px_40px_minmax(0,1fr)] items-center gap-1 text-center sm:grid-cols-[minmax(90px,1fr)_48px_32px_48px_minmax(90px,1fr)] sm:gap-1.5'>
                      <div className='truncate pl-1 text-left text-[11px] font-semibold text-slate-100 sm:pl-2 sm:text-[12px]'>
                        {left?.name ?? '-'}
                      </div>
                      <div className='rounded-md px-1 py-[2px] text-[10px] font-semibold text-white sm:py-[3px] sm:text-[11px]' style={{ backgroundColor: getShareRatingChipColor(leftRating, rightRating) }}>
                        {leftRating !== null ? leftRating.toFixed(1) : '-'}
                      </div>
                      <div className='flex w-6 items-center justify-center sm:w-8'>
                        <img src={ROLE_META[role].iconPath} alt={ROLE_META[role].label} width={16} height={16} className='h-4 w-4 translate-x-[1px] object-contain sm:h-[18px] sm:w-[18px]' />
                      </div>
                      <div className='rounded-md px-1 py-[2px] text-[10px] font-semibold text-white sm:py-[3px] sm:text-[11px]' style={{ backgroundColor: getShareRatingChipColor(rightRating, leftRating) }}>
                        {rightRating !== null ? rightRating.toFixed(1) : '-'}
                      </div>
                      <div className='truncate pr-1 text-right text-[11px] font-semibold text-slate-100 sm:pr-2 sm:text-[12px]'>
                        {right?.name ?? '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}

function CommentInputBar({
  parentId,
  placeholder,
  compact = false,
  viewer,
  onCancelReply,
  onSubmitted,
  onSubmitComment,
  onError,
}: {
  parentId?: string | null;
  placeholder: string;
  compact?: boolean;
  viewer: MatchDetailViewer;
  onCancelReply?: () => void;
  onSubmitted?: () => void;
  onSubmitComment: (input: { text: string; parentId?: string | null }) => Promise<void>;
  onError?: (message: string) => void;
}) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);

  const isAuthenticated = Boolean(viewer.id);
  const hasNickname = Boolean(viewer.hasNickname);
  const canWrite = isAuthenticated && hasNickname;
  const avatarLabel = isAuthenticated ? '나' : '';
  const canSubmit = canWrite && !pending && text.trim().length >= COMMENT_MIN_LENGTH;

  const submitComment = async () => {
    if (!canSubmit) {
      return;
    }
    try {
      setPending(true);
      await onSubmitComment({ text, parentId: parentId ?? null });
      setText('');
      onSubmitted?.();
      onCancelReply?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '댓글 등록에 실패했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-[18px] p-2.5',
        compact ? 'ml-10 mr-2 border border-white/10 bg-[#31313C] sm:ml-14 sm:mr-4' : 'border-none bg-transparent p-0',
      )}
    >
      <div className={cn('flex w-full min-w-0 flex-nowrap justify-start', compact ? 'items-end gap-2' : 'items-start gap-3')}>
        {!compact ? (
          <Avatar className='mt-1 h-8 w-8 shrink-0 bg-[#5a3a8a] text-[11px] font-black text-white'>{avatarLabel}</Avatar>
        ) : null}
        <div className='relative min-w-0 flex-1'>
          <input
            type='text'
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submitComment();
              }
            }}
            maxLength={COMMENT_MAX_LENGTH}
            className={cn(
              'block h-12 w-full rounded-[14px] px-4 pr-16 text-[13px] outline-none transition sm:text-[14px]',
              compact
                ? '!border !border-white/15 !bg-[#1E1E2E] !text-slate-100 placeholder:!text-slate-300 focus:!border-[#8B5CF6]'
                : '!border !border-white/15 !bg-[#2a2a3a] !text-slate-100 placeholder:!text-slate-300 focus:!border-[#8B5CF6]',
            )}
            placeholder={
              !isAuthenticated
                ? '로그인 후 댓글을 작성할 수 있습니다.'
                : !hasNickname
                  ? '닉네임 설정 후 댓글을 작성할 수 있습니다.'
                  : placeholder
            }
            disabled={!canWrite || pending}
          />
          <div className='absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1'>
            <Button
              disabled={!canSubmit}
              className={cn(
                'h-6 rounded-[8px] px-2 text-[10px] font-semibold',
                compact ? 'bg-[#3E365F] text-white' : 'bg-[#3E365F] text-white',
                canSubmit ? 'opacity-100' : 'opacity-30',
              )}
              onClick={() => void submitComment()}
            >
              {pending ? '...' : parentId ? '답글' : '등록'}
            </Button>
            {onCancelReply ? (
              <button
                type='button'
                className='rounded-[8px] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:text-white'
                onClick={onCancelReply}
              >
                닫기
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentActions({
  comment,
  isMine,
  isAuthenticated,
  canRecommend,
  canReply,
  onReplyToggle,
  onToggleLike,
  onDelete,
  onStartEdit,
  disabled = false,
}: {
  comment: MatchComment;
  isMine: boolean;
  isAuthenticated: boolean;
  canRecommend: boolean;
  canReply: boolean;
  onReplyToggle?: () => void;
  onToggleLike: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onStartEdit: (comment: MatchComment) => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [likePending, setLikePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menuRef.current || !target) {
        return;
      }
      if (!menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  return (
    <div ref={menuRef} className={cn('relative mt-1 flex items-center justify-between gap-2 text-[12px] font-normal', menuOpen ? 'z-30' : 'z-0')}>
      <div className='flex items-center gap-2'>
        {canRecommend ? (
          <button
            type='button'
            disabled={likePending || disabled}
            className={cn(
              'allow-disabled-cursor inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-normal transition',
              comment.likedByMe ? 'text-[#A56BFF]' : 'text-slate-400 hover:text-slate-200',
            )}
            onClick={async () => {
              if (!isAuthenticated) {
                router.push('/signin');
                return;
              }
              try {
                setLikePending(true);
                await onToggleLike(comment.id);
              } finally {
                setLikePending(false);
              }
            }}
          >
            <span>{comment.likedByMe ? '♥' : '♡'}</span>
            <span>{comment.likes}</span>
          </button>
        ) : null}
        {canReply ? (
          <button type='button' className='rounded-full px-1.5 py-0.5 font-normal text-slate-400 hover:text-slate-200' onClick={onReplyToggle}>
            답글{comment.replyCount > 0 ? ` ${comment.replyCount}` : ''}
          </button>
        ) : null}
      </div>
      {isMine ? (
        <>
          <button
            type='button'
            disabled={disabled}
            className='rounded-full px-1 py-0.5 text-base leading-none text-slate-500 hover:text-slate-300'
            aria-label='더보기'
            onClick={() => setMenuOpen((open) => !open)}
          >
            …
          </button>
          {menuOpen ? (
            <div className='absolute right-0 top-6 z-50 min-w-[110px] rounded-xl border border-[#2A2B36] bg-[#11131A] p-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.35)]'>
              <button
                type='button'
                disabled={disabled}
                className='block w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-200 hover:bg-[#1A1D27]'
                onClick={() => {
                  onStartEdit(comment);
                  setMenuOpen(false);
                }}
              >
                수정
              </button>
              <button
                type='button'
                disabled={deletePending || disabled}
                className='allow-disabled-cursor block w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-200 hover:bg-[#1A1D27] hover:text-rose-300'
                onClick={async () => {
                  const confirmed = window.confirm('이 댓글을 삭제할까요?');
                  if (!confirmed) {
                    setMenuOpen(false);
                    return;
                  }
                  try {
                    setDeletePending(true);
                    await onDelete(comment.id);
                  } finally {
                    setDeletePending(false);
                    setMenuOpen(false);
                  }
                }}
              >
                삭제
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function CommentBubble({
  comment,
  isMine,
  isAuthenticated,
  canReply,
  canRecommend,
  onReplyToggle,
  onToggleLike,
  onDelete,
  onStartEdit,
  isEditing,
  editDraft,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
}: {
  comment: MatchComment;
  isMine: boolean;
  isAuthenticated: boolean;
  canReply: boolean;
  canRecommend: boolean;
  onReplyToggle?: () => void;
  onToggleLike: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onStartEdit: (comment: MatchComment) => void;
  isEditing: boolean;
  editDraft: string;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: (commentId: string) => Promise<void>;
  onCancelEdit: () => void;
}) {
  const isReply = !canReply;
  const trimmedDraft = editDraft.trim();
  const canSaveEdit = trimmedDraft.length >= COMMENT_MIN_LENGTH && trimmedDraft.length <= COMMENT_MAX_LENGTH && !comment.pending;

  return (
    <div className='group flex w-full min-w-0 justify-start gap-3'>
      <Avatar className={cn('mt-1 h-8 w-8 shrink-0 text-[11px] font-bold', isMine ? 'bg-[#5a3a8a] text-white' : 'bg-[#E9E9E6] text-[#353535]')}>
        {isMine ? '나' : getInitials(comment.user)}
      </Avatar>
      <div className='w-full min-w-0'>
        <div
          className={cn(
            'rounded-2xl border px-4 py-3',
            isMine ? 'border-[#5a3a8a] bg-[#1E1E2E] text-slate-100' : 'border-[0.5px] border-[rgba(255,255,255,0.08)] bg-[#1E1E2E] text-slate-100',
          )}
        >
          <div className='mb-1 flex items-start justify-between gap-2'>
            <div className='truncate text-[13px] font-medium text-slate-100'>
              {comment.user}
            </div>
            <div className='shrink-0 text-[12px] font-normal text-slate-400'>{comment.createdLabel}</div>
          </div>
          {isEditing ? (
            <div className='space-y-2'>
              <input
                type='text'
                value={editDraft}
                onChange={(event) => onEditDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canSaveEdit) {
                    event.preventDefault();
                    void onSaveEdit(comment.id);
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    onCancelEdit();
                  }
                }}
                maxLength={COMMENT_MAX_LENGTH}
                className='block h-10 w-full rounded-[12px] border border-white/15 bg-[#262638] px-3 text-[13px] text-slate-100 outline-none transition focus:border-[#8B5CF6] sm:text-[14px]'
                autoFocus
              />
              <div className='flex justify-end gap-1'>
                <button type='button' className='rounded-[8px] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:text-white' onClick={onCancelEdit}>
                  취소
                </button>
                <Button
                  disabled={!canSaveEdit}
                  className={cn('h-6 rounded-[8px] px-2 text-[10px] font-semibold text-white', canSaveEdit ? 'bg-[#3E365F] opacity-100' : 'bg-[#3E365F] opacity-30')}
                  onClick={() => void onSaveEdit(comment.id)}
                >
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn('whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-normal leading-[1.6]', isReply ? 'text-[13px]' : 'text-[14px]', comment.pending ? 'opacity-70' : '')}>
              {comment.text}
            </p>
          )}
        </div>
        {!isEditing ? (
          <div className='mt-[2px] w-full px-1'>
            <CommentActions
              comment={comment}
              isMine={isMine}
              isAuthenticated={isAuthenticated}
              canRecommend={canRecommend}
              canReply={canReply}
              onReplyToggle={onReplyToggle}
              onToggleLike={onToggleLike}
              onDelete={onDelete}
              onStartEdit={onStartEdit}
              disabled={Boolean(comment.pending)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  replies,
  viewer,
  viewerId,
  isAuthenticated,
  editingCommentId,
  editDraft,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onToggleLike,
  onDelete,
  onSubmitComment,
  onError,
}: {
  comment: MatchComment;
  replies: MatchComment[];
  viewer: MatchDetailViewer;
  viewerId: string | null;
  isAuthenticated: boolean;
  editingCommentId: string | null;
  editDraft: string;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: (commentId: string) => Promise<void>;
  onCancelEdit: () => void;
  onStartEdit: (comment: MatchComment) => void;
  onToggleLike: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onSubmitComment: (input: { text: string; parentId?: string | null }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const isMine = Boolean(viewerId && comment.userId && viewerId === comment.userId);
  const orderedReplies = replies.slice().reverse();

  return (
    <div className='space-y-2'>
      <CommentBubble
        comment={comment}
        isMine={isMine}
        isAuthenticated={isAuthenticated}
        canReply
        canRecommend
        onReplyToggle={() => setReplyOpen((value) => !value)}
        onToggleLike={onToggleLike}
        onDelete={onDelete}
        onStartEdit={onStartEdit}
        isEditing={editingCommentId === comment.id}
        editDraft={editingCommentId === comment.id ? editDraft : comment.text}
        onEditDraftChange={onEditDraftChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
      />

      {replyOpen ? (
        <CommentInputBar
          parentId={comment.id}
          placeholder=''
          compact
          viewer={viewer}
          onCancelReply={() => setReplyOpen(false)}
          onSubmitted={() => setReplyOpen(false)}
          onSubmitComment={onSubmitComment}
          onError={onError}
        />
      ) : null}

      {orderedReplies.length > 0 ? (
        <div className='ml-6 space-y-2 border-l border-[#3A3342] pl-3 sm:ml-10 sm:pl-4'>
          {orderedReplies.map((reply) => {
            const replyIsMine = Boolean(viewerId && reply.userId && viewerId === reply.userId);
            return (
              <CommentBubble
                key={reply.id}
                comment={reply}
                isMine={replyIsMine}
                isAuthenticated={isAuthenticated}
                canReply={false}
                canRecommend={false}
                onToggleLike={onToggleLike}
                onDelete={onDelete}
                onStartEdit={onStartEdit}
                isEditing={editingCommentId === reply.id}
                editDraft={editingCommentId === reply.id ? editDraft : reply.text}
                onEditDraftChange={onEditDraftChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CommentsSection({ data, viewer }: { data: MatchDetailData; viewer: MatchDetailViewer }) {
  const [sort, setSort] = useState<CommentSort>('latest');
  const [commentItems, setCommentItems] = useState<MatchComment[]>(data.match.commentsList);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const viewerId = viewer.id;
  const viewerNickname = viewer.nickname ?? viewer.name ?? '나';
  const isAuthenticated = Boolean(viewer.id);

  useEffect(() => {
    setCommentItems(data.match.commentsList);
  }, [data.match.commentsList]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
  };

  const rootComments = useMemo(() => {
    const roots = commentItems.filter((comment) => !comment.parentId);
    if (sort === 'top') {
      return roots.slice().sort((a, b) => b.likes - a.likes);
    }
    return roots;
  }, [commentItems, sort]);

  const repliesByParent = useMemo(() => {
    const map = new Map<string, MatchComment[]>();
    for (const comment of commentItems) {
      if (!comment.parentId) {
        continue;
      }
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return map;
  }, [commentItems]);

  const handleSubmitComment = async ({ text, parentId }: { text: string; parentId?: string | null }) => {
    if (!viewerId) {
      throw new Error('로그인이 필요합니다.');
    }

    const optimisticId = `temp_comment_${crypto.randomUUID()}`;
    const optimisticComment: MatchComment = {
      id: optimisticId,
      userId: viewerId,
      parentId: parentId ?? null,
      user: viewerNickname,
      userSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdLabel: '방금 전',
      likes: 0,
      likedByMe: false,
      replyCount: 0,
      text: text.trim(),
      tag: '',
      pending: true,
      isOptimistic: true,
    };

    setCommentItems((current) => {
      const next = [optimisticComment, ...current];
      if (!parentId) {
        return next;
      }
      return next.map((item) => (item.id === parentId ? { ...item, replyCount: item.replyCount + 1 } : item));
    });

    try {
      const payload = await postJson<{ ok: true; comment: MatchComment }>(`/api/matches/${data.match.id}/comments`, {
        text,
        parentId: parentId ?? null,
      });
      setCommentItems((current) => current.map((item) => (item.id === optimisticId ? payload.comment : item)));
    } catch (error) {
      setCommentItems((current) => {
        const filtered = current.filter((item) => item.id !== optimisticId);
        if (!parentId) {
          return filtered;
        }
        return filtered.map((item) => (item.id === parentId ? { ...item, replyCount: Math.max(0, item.replyCount - 1) } : item));
      });
      throw error;
    }
  };

  const handleToggleLike = async (commentId: string) => {
    const target = commentItems.find((item) => item.id === commentId);
    if (!target) {
      return;
    }
    const previousLiked = target.likedByMe;
    const previousLikes = target.likes;

    setCommentItems((current) =>
      current.map((item) =>
        item.id === commentId
          ? { ...item, likedByMe: !item.likedByMe, likes: Math.max(0, item.likes + (item.likedByMe ? -1 : 1)) }
          : item,
      ),
    );

    try {
      const payload = await postJson<{ ok: true; likedByMe: boolean; likes: number }>(
        `/api/matches/${data.match.id}/comments/${commentId}/recommend`,
        {},
      );
      setCommentItems((current) => current.map((item) => (item.id === commentId ? { ...item, likedByMe: payload.likedByMe, likes: payload.likes } : item)));
    } catch (error) {
      setCommentItems((current) => current.map((item) => (item.id === commentId ? { ...item, likedByMe: previousLiked, likes: previousLikes } : item)));
      showToast(error instanceof Error ? error.message : '좋아요 처리에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const snapshot = commentItems;
    const target = snapshot.find((item) => item.id === commentId);
    if (!target) {
      return;
    }

    const deletedIds = new Set<string>([commentId]);
    if (!target.parentId) {
      for (const item of snapshot) {
        if (item.parentId === commentId) {
          deletedIds.add(item.id);
        }
      }
    }

    setCommentItems((current) => {
      const filtered = current.filter((item) => !deletedIds.has(item.id));
      if (!target.parentId) {
        return filtered;
      }
      return filtered.map((item) => (item.id === target.parentId ? { ...item, replyCount: Math.max(0, item.replyCount - 1) } : item));
    });
    if (editingCommentId && deletedIds.has(editingCommentId)) {
      setEditingCommentId(null);
      setEditDraft('');
    }

    try {
      await deleteJson<{ ok: true; commentId: string }>(`/api/matches/${data.match.id}/comments/${commentId}`);
    } catch (error) {
      setCommentItems(snapshot);
      showToast(error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.');
    }
  };

  const handleStartEdit = (comment: MatchComment) => {
    setEditingCommentId(comment.id);
    setEditDraft(comment.text);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditDraft('');
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmed = editDraft.trim();
    if (trimmed.length < COMMENT_MIN_LENGTH) {
      showToast(`댓글은 ${COMMENT_MIN_LENGTH}자 이상 작성해 주세요.`);
      return;
    }

    const target = commentItems.find((item) => item.id === commentId);
    if (!target) {
      return;
    }
    const previousText = target.text;
    const previousUpdatedAt = target.updatedAt;

    setCommentItems((current) => current.map((item) => (item.id === commentId ? { ...item, text: trimmed, updatedAt: new Date().toISOString() } : item)));
    setEditingCommentId(null);
    setEditDraft('');

    try {
      const payload = await patchJson<{ ok: true; comment: MatchComment }>(`/api/matches/${data.match.id}/comments/${commentId}`, { text: trimmed });
      setCommentItems((current) => current.map((item) => (item.id === commentId ? payload.comment : item)));
    } catch (error) {
      setCommentItems((current) => current.map((item) => (item.id === commentId ? { ...item, text: previousText, updatedAt: previousUpdatedAt } : item)));
      setEditingCommentId(commentId);
      setEditDraft(previousText);
      showToast(error instanceof Error ? error.message : '댓글 수정에 실패했습니다.');
    }
  };

  return (
    <Card className='overflow-visible border border-[#1E1E27] bg-[#07080D]'>
      <CardContent className='space-y-4 px-4 pb-5 pt-6 text-[#E5E7EB] sm:px-6 sm:pb-6'>
        <div className='flex items-end justify-between gap-3'>
          <div className='flex items-center gap-3 text-[13px] text-slate-300'>
            <span className='font-semibold'>정렬</span>
            <button
              type='button'
              className={cn(
                'rounded-2xl border px-4 py-1.5 font-semibold',
                sort === 'latest' ? 'border-[#2A2B36] bg-[#0D0E16] text-white' : 'border-[#2A2B36] bg-transparent text-slate-500',
              )}
              onClick={() => setSort('latest')}
            >
              최신순
            </button>
            <button
              type='button'
              className={cn(
                'rounded-2xl border px-4 py-1.5 font-semibold',
                sort === 'top' ? 'border-[#2A2B36] bg-[#0D0E16] text-white' : 'border-[#2A2B36] bg-transparent text-slate-500',
              )}
              onClick={() => setSort('top')}
            >
              추천순
            </button>
          </div>
          <div className='text-[13px] font-semibold text-slate-300'>댓글 {rootComments.length}개</div>
        </div>

        <div className='mx-auto max-w-6xl'>
          <CommentInputBar viewer={viewer} placeholder='댓글을 입력하세요...' onSubmitComment={handleSubmitComment} onError={showToast} />
        </div>

        <div className='rounded-[20px] border border-[#1E1E27] bg-transparent p-0'>
          {rootComments.length === 0 ? (
            <div className='py-8 text-center text-sm text-slate-500'>아직 대화가 없습니다.</div>
          ) : (
            <div className='mx-auto max-w-6xl space-y-4'>
              {rootComments.map((comment) => (
                <div key={comment.id} className='border-b border-[rgba(255,255,255,0.06)] pb-4 last:border-b-0'>
                  <CommentThread
                    comment={comment}
                    replies={repliesByParent.get(comment.id) ?? []}
                    viewer={viewer}
                    viewerId={viewerId}
                    isAuthenticated={isAuthenticated}
                    editingCommentId={editingCommentId}
                    editDraft={editDraft}
                    onEditDraftChange={setEditDraft}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onStartEdit={handleStartEdit}
                    onToggleLike={handleToggleLike}
                    onDelete={handleDeleteComment}
                    onSubmitComment={handleSubmitComment}
                    onError={showToast}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {toastMessage ? (
          <div className='pointer-events-none fixed bottom-6 right-6 z-[80] rounded-lg bg-[#232633] px-3 py-1.5 text-[11px] font-medium text-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.35)]'>
            {toastMessage}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BottomFixedCta({ state }: { state: DetailState }) {
  return null;
}

export function MatchDetailStateView({ data, viewer }: { data: MatchDetailData; viewer: MatchDetailViewer }) {
  const state = resolveDetailState(data.match);

  return (
    <div className='space-y-5 pb-24'>
      <MatchHeader data={data} state={state} />

      {state === 'PRE_MATCH' ? <PreMatchView data={data} /> : null}
      {state === 'LIVE' || state === 'FINISHED' ? <StartedView data={data} state={state} /> : null}

      <CommentsSection data={data} viewer={viewer} />
      <BottomFixedCta state={state} />
    </div>
  );
}
