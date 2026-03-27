'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { StarIcon } from "./icons";
import { getInitials, getStatusLabel, ratingTone } from "./utils";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, Input, Progress, SectionTitle, StatCard } from "./ui";
import type { MatchWithWeek, UserProfile } from "./types";
import { getTeamDisplayName } from "./team-branding";

export function MatchCenter({ match }: { match: MatchWithWeek }) {
  return (
    <div className="space-y-6">
      <MatchHero match={match} />
      <PredictionSection match={match} canWrite={false} onSubmit={async () => null} />
      <RatingsSection match={match} canWrite={false} onSubmit={async () => null} />
      <CommentsSection match={match} canWrite={false} onSubmit={async () => null} />
    </div>
  );
}

export function MatchHero({ match }: { match: MatchWithWeek }) {
  return (
    <Card>
      <CardContent className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={match.status === "scheduled" ? "success" : "danger"}>{getStatusLabel(match.status)}</Badge>
            <Badge variant="outline">{match.weekLabel}</Badge>
            <Badge variant="outline">{match.league}</Badge>
            <Badge variant="accent">패치 {match.patch}</Badge>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">
            {getTeamDisplayName(match.teamA)} vs {getTeamDisplayName(match.teamB)}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">선택한 경기의 예측, 평점, 댓글 흐름을 한 화면에서 확인하는 보조 뷰입니다.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="예측 참여" value={match.predictionSummary.totalVotes.toLocaleString()} tone="accent" />
            <StatCard label="평점 수" value={match.totalRatings.toLocaleString()} />
            <StatCard label="댓글 수" value={match.comments.toLocaleString()} />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Scoreboard</div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div className="rounded-2xl bg-white p-4">
              <div className="text-xl font-bold text-slate-950">{getTeamDisplayName(match.teamA)}</div>
            </div>
            <div className="text-4xl font-black text-sky-600">{match.score}</div>
            <div className="rounded-2xl bg-white p-4">
              <div className="text-xl font-bold text-slate-950">{getTeamDisplayName(match.teamB)}</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">일정: {match.date}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PredictionSection({
  match,
  canWrite,
  onSubmit,
  onSelectMatch,
  alternativeMatches,
}: {
  match: MatchWithWeek;
  canWrite: boolean;
  onSubmit: (team: string) => Promise<string | null>;
  onSelectMatch?: (matchId: string) => void;
  alternativeMatches?: MatchWithWeek[];
}) {
  const [selectedSide, setSelectedSide] = useState(match.myPredictionTeam ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          eyebrow="Prediction"
          title="경기 예측"
          description="구형 센터 뷰용 보조 예측 카드입니다."
          action={
            alternativeMatches && alternativeMatches.length > 1 && onSelectMatch ? (
              <Button variant="secondary" onClick={() => onSelectMatch(alternativeMatches[0]?.id ?? match.id)}>
                다른 경기 보기
              </Button>
            ) : undefined
          }
        />
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {[match.teamA, match.teamB].map((team, index) => (
            <button
              key={`${match.id}-${team}-${index}`}
              onClick={() => setSelectedSide(team)}
              className={`rounded-[24px] border p-5 text-left transition ${selectedSide === team ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}
              disabled={!canWrite}
            >
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">예측 비율</div>
              <div className="mt-2">
                <div className="text-xl font-extrabold text-slate-950">{getTeamDisplayName(team)}</div>
              </div>
              <div className="mt-3 text-4xl font-black text-slate-950">
                {index === 0 ? match.predictionSummary.teamA : match.predictionSummary.teamB}%
              </div>
            </button>
          ))}
        </div>
        {feedback ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{feedback}</div> : null}
        <Button
          className="w-full"
          disabled={!canWrite || pending || !selectedSide}
          onClick={async () => {
            setPending(true);
            const error = await onSubmit(selectedSide);
            setFeedback(error ?? "예측을 저장했습니다.");
            setPending(false);
          }}
        >
          {pending ? "저장 중..." : "예측 저장"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function RatingsSection({
  match,
  canWrite,
  onSubmit,
}: {
  match: MatchWithWeek;
  canWrite: boolean;
  onSubmit: (payload: { playerId: string; score: number; comment: string }) => Promise<string | null>;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState(match.players[0]?.id ?? "");
  const [scoreInput, setScoreInput] = useState("8.5");
  const [commentInput, setCommentInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Card>
      <CardHeader>
        <SectionTitle eyebrow="Rating" title="선수 평점" description="구형 센터 뷰용 보조 평점 카드입니다." />
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 2xl:grid-cols-2">
          {match.players.map((player) => (
            <div key={`${player.team}-${player.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <Avatar className="h-12 w-12 text-sm font-black text-slate-800">{getInitials(player.name)}</Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-slate-950">{player.name}</div>
                  <Badge variant="outline">{player.team}</Badge>
                  <Badge variant="outline">{player.role}</Badge>
                </div>
                <Progress value={player.rating * 10} className="mt-3" />
              </div>
              <div className={ratingTone(player.rating) + " rounded-2xl border px-3 py-2 text-sm font-bold"}>{player.rating.toFixed(1)}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {match.players.map((player) => (
                <button
                  key={`${player.team}-${player.id}`}
                  onClick={() => setSelectedPlayer(player.id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${selectedPlayer === player.id ? "border-sky-300 bg-sky-50 text-slate-950" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {getTeamDisplayName(player.team)} · {player.name}
                </button>
              ))}
            </div>
            <Input value={scoreInput} onChange={(event) => setScoreInput(event.target.value)} />
            <textarea
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none"
            />
            {feedback ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{feedback}</div> : null}
            <Button
              className="w-full"
              disabled={!canWrite || pending || !selectedPlayer}
              onClick={async () => {
                setPending(true);
                const error = await onSubmit({ playerId: selectedPlayer, score: Number(scoreInput), comment: commentInput });
                setFeedback(error ?? "평점을 등록했습니다.");
                setPending(false);
              }}
            >
              {pending ? "등록 중..." : "평점 등록"}
            </Button>
          </div>
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-5 text-sm leading-7 text-slate-600">
            선수 선택, 숫자 입력, 코멘트 기반의 구형 보조 UI입니다.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommentsSection({
  match,
  canWrite,
  onSubmit,
}: {
  match: MatchWithWeek;
  canWrite: boolean;
  onSubmit: (text: string) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Card>
      <CardHeader>
        <SectionTitle eyebrow="Reaction" title="실시간 반응" description="경기 단위 댓글 보조 UI입니다." />
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            disabled={!canWrite || pending}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500">{feedback ?? "댓글은 관리자가 숨김 처리할 수 있습니다."}</div>
            <Button
              disabled={!canWrite || pending || text.trim().length < 2}
              onClick={async () => {
                setPending(true);
                const error = await onSubmit(text);
                setFeedback(error ?? "댓글을 등록했습니다.");
                if (!error) {
                  setText("");
                }
                setPending(false);
              }}
            >
              {pending ? "등록 중..." : "댓글 등록"}
            </Button>
          </div>
        </div>

        {match.commentsList.map((comment) => (
          <div key={comment.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 text-xs font-bold text-slate-800">{getInitials(comment.user)}</Avatar>
                <div>
                  <div className="font-semibold text-slate-950">{comment.user}</div>
                  <div className="text-xs text-slate-500">{comment.createdLabel}</div>
                </div>
              </div>
              <Badge variant="accent">{comment.tag}</Badge>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">{comment.text}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <StarIcon className="h-4 w-4" />
              공감 {comment.likes}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SidePanel({ profile }: { profile: UserProfile }) {
  const profileLabel = profile.isAuthenticated ? "로그인 계정" : "게스트 모드";
  const profileSubLabel = profile.isAuthenticated
    ? profile.email || `Lv.${profile.level}`
    : `Lv.${profile.level}`;

  return (
    <div className="xl:sticky xl:top-28 xl:self-start">
      <Card className="xl:max-w-[308px] xl:justify-self-end">
        <CardHeader>
          <SectionTitle eyebrow="Profile" title="마이 페이지 요약" />
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 text-sm font-black text-slate-800">
                {profile.image ? (
                  <Image src={profile.image} alt={profile.nickname} width={56} height={56} className="h-full w-full object-cover" unoptimized />
                ) : (
                  getInitials(profile.nickname)
                )}
              </Avatar>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600/70">{profileLabel}</div>
                <div className="mt-1 truncate text-lg font-black text-slate-950">{profile.nickname}</div>
                <div className="mt-1 truncate text-sm text-slate-500">{profileSubLabel}</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              {profile.isAuthenticated
                ? "로그인 계정으로 예측, 평점, 댓글 참여 이력을 쌓고 있습니다."
                : "읽기 전용으로 둘러보는 중입니다. 로그인하면 직접 참여할 수 있습니다."}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="보유 코인" value={`${profile.points.toLocaleString()}`} tone="accent" />
            <StatCard label="연속 적중" value={`${profile.predictionStats.streak}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="적중" value={`${profile.predictionStats.hit}`} />
            <StatCard label="실패" value={`${profile.predictionStats.miss}`} />
          </div>
          {profile.isAuthenticated ? (
            <Link href="/me" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              마이페이지로 이동
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

