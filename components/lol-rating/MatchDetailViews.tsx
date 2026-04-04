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
import { Avatar, Badge, Button, Card, CardContent } from './ui';
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
      <CardContent className='px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6'>
        <div className='text-center'>
          <div className='flex items-start justify-between gap-3'>
            <div className='text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700'>{data.match.league}</div>
            {state === 'LIVE' ? <LiveBadge compact /> : null}
          </div>
          <div className='mx-auto mt-3 grid max-w-[860px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 rounded-[20px] border border-slate-200 bg-white px-5 py-5 sm:px-8'>
            <div className='text-center'>
              <div className='flex flex-col items-center gap-3'>
                <TeamLogo team={data.match.teamA} size={52} imageClassName='p-2' priority />
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
              <div className='mt-3 text-sm font-semibold text-slate-600'>{data.match.stage}</div>
            </div>

            <div className='text-center'>
              <div className='flex flex-col items-center gap-3'>
                <TeamLogo team={data.match.teamB} size={52} imageClassName='p-2' priority />
                <div className='text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl'>{getTeamDisplayName(data.match.teamB)}</div>
              </div>
            </div>
          </div>
          <div className='mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600'>
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

function StarScorePicker({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (score: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const latestClientXRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liveScore, setLiveScore] = useState(value ?? 0);

  useEffect(() => {
    if (!isDragging) {
      setLiveScore(value ?? 0);
    }
  }, [value, isDragging]);

  const updateScoreByClientX = (clientX: number, commit: boolean) => {
    if (!trackRef.current || disabled) {
      return;
    }

    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const clampedRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const snappedStars = Math.round(clampedRatio * 5 * 2) / 2;
    const nextScore = Math.round(snappedStars * 2);

    setLiveScore(nextScore);
    if (commit) {
      onChange(nextScore);
    }
  };

  const startMouseDrag = (clientX: number) => {
    setIsDragging(true);
    latestClientXRef.current = clientX;
    updateScoreByClientX(clientX, false);

    const handleMouseMove = (event: MouseEvent) => {
      latestClientXRef.current = event.clientX;
      updateScoreByClientX(event.clientX, false);
    };

    const handleMouseUp = (event: MouseEvent) => {
      const commitX = latestClientXRef.current ?? event.clientX;
      updateScoreByClientX(commitX, true);
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const startTouchDrag = (clientX: number) => {
    setIsDragging(true);
    latestClientXRef.current = clientX;
    updateScoreByClientX(clientX, false);

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      latestClientXRef.current = touch.clientX;
      updateScoreByClientX(touch.clientX, false);
      event.preventDefault();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const commitX = touch?.clientX ?? latestClientXRef.current;
      if (typeof commitX === 'number') {
        updateScoreByClientX(commitX, true);
      }
      setIsDragging(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
  };

  const fillPercent = (liveScore / 10) * 100;
  const scoreLabel = SCORE_LABEL_BY_POINT[liveScore] ?? SCORE_LABEL_BY_POINT[0];

  return (
    <div className='space-y-1'>
      <div
        ref={trackRef}
        role='slider'
        aria-label='별점 선택'
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={liveScore}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          'relative select-none leading-none',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
        onMouseDown={(event) => {
          if (disabled) {
            return;
          }
          startMouseDrag(event.clientX);
        }}
        onTouchStart={(event) => {
          if (disabled) {
            return;
          }
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          startTouchDrag(touch.clientX);
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            const nextScore = Math.min(10, liveScore + 1);
            setLiveScore(nextScore);
            onChange(nextScore);
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            const nextScore = Math.max(0, liveScore - 1);
            setLiveScore(nextScore);
            onChange(nextScore);
          }
        }}
      >
        <div className='text-base tracking-[0.1em] text-[#3C4052] sm:text-2xl'>★★★★★</div>
        <div className='pointer-events-none absolute inset-0 overflow-hidden' style={{ width: `${fillPercent}%` }}>
          <div className='text-base tracking-[0.1em] text-[#8B5CF6] sm:text-2xl'>★★★★★</div>
        </div>
      </div>
      <div className='text-[11px] font-semibold text-[#8793B4] sm:text-xs'>{scoreLabel}</div>
    </div>
  );
}

type MatchRatingPlayer = MatchDetailData['match']['players'][number];

function formatRatingPoint(score: number | null) {
  return score !== null ? `${score.toFixed(1)}점` : '--';
}

function RatingProgressSummary({ ratedCount, totalCount }: { ratedCount: number; totalCount: number }) {
  const progress = totalCount > 0 ? (ratedCount / totalCount) * 100 : 0;

  return (
    <div className='rounded-[24px] border border-white/10 bg-[#151A26] p-4 shadow-[0_14px_40px_rgba(2,6,23,0.28)] sm:p-5'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E89A8]'>평가 진행률</div>
          <div className='mt-1 flex items-end gap-2'>
            <span className='text-[1.9rem] font-black tracking-[-0.04em] text-white'>{ratedCount}</span>
            <span className='pb-1 text-sm font-semibold text-[#93A0C3]'>/ {totalCount}</span>
          </div>
        </div>
        <div className='rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/12 px-3 py-1 text-xs font-semibold text-[#D7C9FF]'>
          {Math.round(progress)}%
        </div>
      </div>
      <div className='mt-3 h-2 overflow-hidden rounded-full bg-[#242B3C]'>
        <div className='h-full rounded-full bg-[#8B5CF6] transition-[width] duration-300' style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function PlayerRatingCard({
  player,
  selected,
  draftScore,
  draftComment,
  pending,
  saved,
  canWrite,
  onSelect,
  onScoreChange,
  onCommentChange,
  onSave,
}: {
  player: MatchRatingPlayer;
  selected: boolean;
  draftScore: number | null;
  draftComment: string;
  pending: boolean;
  saved: boolean;
  canWrite: boolean;
  onSelect: () => void;
  onScoreChange: (score: number) => void;
  onCommentChange: (value: string) => void;
  onSave: () => void;
}) {
  const averageScore = Number(player.rating.toFixed(1));
  const hasViewerScore = draftScore !== null;
  const saveDisabled = !canWrite || pending || draftScore === null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] border transition-all duration-200',
        selected
          ? 'border-[#8B5CF6] bg-[linear-gradient(180deg,rgba(139,92,246,0.16)_0%,rgba(16,20,31,1)_30%,rgba(16,20,31,1)_100%)] shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_22px_50px_rgba(4,8,20,0.45)]'
          : 'border-white/8 bg-[#10141F] shadow-[0_14px_32px_rgba(4,8,20,0.28)]',
      )}
    >
      <button
        type='button'
        onClick={onSelect}
        aria-pressed={selected}
        className='flex min-h-[138px] w-full flex-col gap-4 px-4 py-4 text-left sm:px-5'
      >
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <Avatar className='h-12 w-12 shrink-0 border-white/10 bg-[#22283A] text-sm font-black text-white'>
              {getInitials(player.name)}
            </Avatar>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#DCE3FF]'>
                  <Image src={ROLE_META[player.role].iconPath} alt={ROLE_META[player.role].label} width={14} height={14} className='h-3.5 w-3.5 object-contain' />
                  {ROLE_META[player.role].label}
                </span>
                <span className='text-[11px] font-semibold text-[#7E89A8]'>{getTeamDisplayName(player.team)}</span>
              </div>
              <div className='mt-1 truncate text-xl font-black tracking-[-0.03em] text-white'>{player.name}</div>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
              hasViewerScore
                ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                : 'border border-white/10 bg-white/5 text-[#9AA6C9]',
            )}
          >
            {hasViewerScore ? '평가 완료' : '평가 전'}
          </span>
        </div>

        <div className='grid grid-cols-2 gap-2.5'>
          <div className='rounded-[18px] border border-white/8 bg-[#1A1F2D] p-3'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7E89A8]'>평균 평점</div>
            <div className='mt-1 text-[1.25rem] font-black tracking-[-0.04em] text-white'>{formatRatingPoint(averageScore)}</div>
            <div className='mt-1 text-[11px] text-[#8E9ABB]'>{player.ratingCount}명 참여</div>
          </div>
          <div className='rounded-[18px] border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-3'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[#CDBBFF]'>내 평점</div>
            <div className='mt-1 text-[1.25rem] font-black tracking-[-0.04em] text-[#F1ECFF]'>
              {hasViewerScore ? formatRatingPoint(draftScore) : '--'}
            </div>
            <div className='mt-1 text-[11px] text-[#C5B5F6]'>{hasViewerScore ? '저장 후 반영됨' : '별점 선택 전'}</div>
          </div>
        </div>
      </button>

      {selected ? (
        <div className='border-t border-white/8 bg-[#0D111B] px-4 py-4 sm:px-5'>
          <div className='rounded-[20px] border border-white/8 bg-[#131826] p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7E89A8]'>내 평점 입력</div>
                <div className='mt-1 text-lg font-black tracking-[-0.03em] text-white'>
                  {hasViewerScore ? formatRatingPoint(draftScore) : '별을 드래그해 선택'}
                </div>
              </div>
              {saved ? (
                <span className='rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200'>
                  저장됨
                </span>
              ) : null}
            </div>

            <div className='mt-4'>
              <StarScorePicker value={draftScore} disabled={!canWrite || pending} onChange={onScoreChange} />
            </div>

            <div className='mt-4'>
              <textarea
                value={draftComment}
                onChange={(event) => onCommentChange(event.target.value.slice(0, COMMENT_MAX_LENGTH))}
                placeholder='한줄 코멘트 남기기 (선택)'
                className='min-h-[104px] w-full resize-none rounded-[18px] border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.18)]'
                disabled={!canWrite || pending}
              />
              <div className='mt-2 flex items-center justify-between gap-3'>
                <span className='text-[11px] font-medium text-[#7E89A8]'>{draftComment.length}/{COMMENT_MAX_LENGTH}</span>
                <button
                  type='button'
                  className='inline-flex min-h-[46px] min-w-[96px] items-center justify-center rounded-full bg-[#8B5CF6] px-5 text-sm font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:bg-[#4B4F61] disabled:text-[#B6BED8]'
                  onClick={onSave}
                  disabled={saveDisabled}
                >
                  {pending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FinishedView({ data }: { data: MatchDetailData }) {
  const COMMENT_PAGE_SIZE = 8;
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [commentDraftByPlayerId, setCommentDraftByPlayerId] = useState<Record<string, string>>({});
  const [viewerScoreByPlayerId, setViewerScoreByPlayerId] = useState<Record<string, number>>({});
  const [commentPendingByPlayerId, setCommentPendingByPlayerId] = useState<Record<string, boolean>>({});
  const [commentSavedByPlayerId, setCommentSavedByPlayerId] = useState<Record<string, boolean>>({});
  const [ratingCommentPage, setRatingCommentPage] = useState(1);
  const [ratingActionError, setRatingActionError] = useState<string | null>(null);
  const [ratingComments, setRatingComments] = useState(data.match.ratingComments);
  const canWrite = true;
  const playerById = useMemo(() => new Map(data.match.players.map((player) => [player.id, player])), [data.match.players]);
  const totalRatingCommentPages = Math.max(1, Math.ceil(ratingComments.length / COMMENT_PAGE_SIZE));
  const pagedRatingComments = useMemo(() => {
    const startIndex = (ratingCommentPage - 1) * COMMENT_PAGE_SIZE;
    return ratingComments.slice(startIndex, startIndex + COMMENT_PAGE_SIZE);
  }, [ratingComments, ratingCommentPage]);

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
  const teamSections = useMemo(
    () =>
      [data.match.teamA, data.match.teamB].map((teamCode) => ({
        teamCode,
        label: getTeamDisplayName(teamCode),
        players: ROLE_ORDER.map((role) => getPlayerByTeamAndRole(teamCode, role)).filter(
          (player): player is MatchRatingPlayer => Boolean(player),
        ),
      })),
    [data.match.teamA, data.match.teamB, data.match.players],
  );
  const ratedCount = orderedSelectablePlayers.filter(
    (player) => (viewerScoreByPlayerId[player.id] ?? player.viewerScore ?? null) !== null,
  ).length;

  useEffect(() => {
    setRatingComments(data.match.ratingComments);
  }, [data.match.ratingComments]);

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

  useEffect(() => {
    if (selectedPlayerId && playerById.has(selectedPlayerId)) {
      return;
    }
    setSelectedPlayerId(orderedSelectablePlayers[0]?.id ?? null);
  }, [orderedSelectablePlayers, playerById, selectedPlayerId]);

  const upsertRatingComment = (ratingComment: MatchDetailData['match']['ratingComments'][number] | null | undefined) => {
    if (!ratingComment) {
      return;
    }
    setRatingComments((current) => [ratingComment, ...current.filter((item) => item.id !== ratingComment.id)]);
    setRatingCommentPage(1);
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
      setPendingPlayerId(playerId);
      setCommentPendingByPlayerId((prev) => ({ ...prev, [playerId]: true }));
      const comment = commentDraftByPlayerId[playerId] ?? '';
      const payload = await postJson<{ ok: true; ratingComment?: MatchDetailData['match']['ratingComments'][number] | null }>(
        `/api/matches/${data.match.id}/ratings`,
        { playerId, score, comment },
      );
      setCommentSavedByPlayerId((prev) => ({ ...prev, [playerId]: true }));
      upsertRatingComment(payload.ratingComment);
      window.setTimeout(() => {
        setCommentSavedByPlayerId((prev) => ({ ...prev, [playerId]: false }));
      }, 1200);
    } catch (error) {
      setRatingActionError(error instanceof Error ? error.message : '코멘트 저장에 실패했습니다.');
    } finally {
      setPendingPlayerId(null);
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
      <Card className='overflow-hidden border-white/8 bg-[#090D16] shadow-[0_24px_60px_rgba(2,6,23,0.45)]'>
        <CardContent className='space-y-5 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6'>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <div>
              <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A95B2]'>Player Rating</div>
              <h2 className='mt-1 text-[1.85rem] font-black tracking-[-0.04em] text-white'>선수 평점 남기기</h2>
            </div>
            <div className='rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#C9D3F3]'>
              카드 탭 후 바로 평가
            </div>
          </div>

          <RatingProgressSummary ratedCount={ratedCount} totalCount={orderedSelectablePlayers.length} />

          {ratingActionError ? (
            <div className='rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200'>
              {ratingActionError}
            </div>
          ) : null}

          <div className='space-y-5'>
            {teamSections.map((section) => (
              <div key={`rating_team_${section.teamCode}`} className='space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='text-sm font-semibold text-white'>{section.label}</div>
                  <div className='text-[11px] font-medium text-[#7E89A8]'>{section.players.length}명</div>
                </div>
                <div className='space-y-3'>
                  {section.players.map((player) => {
                    const draftScore = viewerScoreByPlayerId[player.id] ?? player.viewerScore ?? null;
                    const draftComment = commentDraftByPlayerId[player.id] ?? player.viewerComment ?? '';

                    return (
                      <PlayerRatingCard
                        key={player.id}
                        player={player}
                        selected={selectedPlayerId === player.id}
                        draftScore={draftScore}
                        draftComment={draftComment}
                        pending={Boolean(commentPendingByPlayerId[player.id])}
                        saved={Boolean(commentSavedByPlayerId[player.id])}
                        canWrite={canWrite}
                        onSelect={() => {
                          setSelectedPlayerId(player.id);
                          setRatingActionError(null);
                        }}
                        onScoreChange={(score) => {
                          setSelectedPlayerId(player.id);
                          setViewerScoreByPlayerId((prev) => ({ ...prev, [player.id]: score }));
                          setCommentSavedByPlayerId((prev) => ({ ...prev, [player.id]: false }));
                        }}
                        onCommentChange={(value) => {
                          setCommentDraftByPlayerId((prev) => ({ ...prev, [player.id]: value }));
                          setCommentSavedByPlayerId((prev) => ({ ...prev, [player.id]: false }));
                        }}
                        onSave={() => savePlayerComment(player.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className='overflow-hidden border-white/8 bg-[#0B1019] shadow-[0_22px_54px_rgba(2,6,23,0.36)]'>
        <CardContent className='space-y-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6'>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <div>
              <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A95B2]'>Community Feed</div>
              <div className='mt-1 text-[1.75rem] font-black tracking-[-0.04em] text-white'>실시간 평점 피드</div>
            </div>
            <div className='rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#C9D3F3]'>
              {ratingComments.length}개 반응
            </div>
          </div>
          {ratingComments.length > 0 ? (
            <>
              <div className='space-y-3'>
                {pagedRatingComments.map((item) => (
                  <div
                    key={item.id}
                    className='rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(26,32,47,0.98)_0%,rgba(16,20,31,0.98)_100%)] p-4 shadow-[0_12px_28px_rgba(2,6,23,0.2)]'
                  >
                    <div className='flex items-start gap-3'>
                      <Avatar className='h-10 w-10 shrink-0 border-white/10 bg-[#242B3D] text-xs font-black text-white'>
                        {getInitials(item.user)}
                      </Avatar>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='text-sm font-semibold text-white'>{item.user}</span>
                          <span className='rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#D5DDF7]'>
                            {item.team} {item.playerName}
                          </span>
                          <span className='rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/14 px-2.5 py-1 text-[11px] font-semibold text-[#D9CCFF]'>
                            {item.score.toFixed(1)}점
                          </span>
                          <span className='text-[11px] font-medium text-[#7E89A8]'>{item.createdLabel}</span>
                        </div>
                        <div className='mt-2 break-words text-sm leading-6 text-[#E5EBFF]'>
                          {item.text.trim().length > 0 ? item.text : '평점만 남겼습니다.'}
                        </div>
                      </div>
                    </div>
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
                        'h-9 min-w-9 rounded-full border px-3 text-xs font-semibold transition',
                        ratingCommentPage === page
                          ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white'
                          : 'border-white/10 bg-white/5 text-[#C9D3F3] hover:border-[#8B5CF6]/50',
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className='rounded-[20px] border border-white/8 bg-[#121826] px-4 py-8 text-center text-sm text-[#9AA6C9]'>
              아직 등록된 선수 평점 코멘트가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card>
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
      </Card>
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
      {state === 'LIVE' ? <LiveView data={data} /> : null}
      {state === 'FINISHED' ? <FinishedView data={data} /> : null}

      <CommentsSection data={data} viewer={viewer} />
      <BottomFixedCta state={state} />
    </div>
  );
}
