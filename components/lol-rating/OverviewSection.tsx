import type { MatchWithWeek } from "./types";
import { TeamLogo, getTeamDisplayName } from "./team-branding";
import { getHomeHighlights, getStatusLabel, getTopRatedPlayers } from "./utils";
import { Badge, Button, Card, CardContent, CardHeader, SectionTitle } from "./ui";

function HighlightCard({ match, onOpen }: { match: MatchWithWeek; onOpen: (matchId: string) => void }) {
  const isFinished = match.status === "finished";
  const topPlayers = isFinished ? getTopRatedPlayers(match, 3) : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{isFinished ? "Hot Rating" : "Hot Prediction"}</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {getTeamDisplayName(match.teamA)} vs {getTeamDisplayName(match.teamB)}
            </h3>
          </div>
          <Badge variant={isFinished ? "danger" : "success"}>{getStatusLabel(match.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>{match.weekLabel}</span>
            <span>{match.date}</span>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div className="flex flex-col items-center gap-3">
              <TeamLogo team={match.teamA} size={68} />
              <div className="text-lg font-bold text-slate-950 sm:text-2xl">{getTeamDisplayName(match.teamA)}</div>
            </div>
            <div className="text-xl font-black text-sky-300 sm:text-3xl">{match.score}</div>
            <div className="flex flex-col items-center gap-3">
              <TeamLogo team={match.teamB} size={68} />
              <div className="text-lg font-bold text-slate-950 sm:text-2xl">{getTeamDisplayName(match.teamB)}</div>
            </div>
          </div>
        </div>

        {isFinished ? (
          topPlayers.length > 0 ? (
            <div className="grid gap-2">
              {topPlayers.map((player, index) => (
                <div key={`${player.team}-${player.id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700">{index + 1}</div>
                    <div>
                      <div className="font-semibold text-slate-950">{player.name}</div>
                      <div className="text-xs text-slate-500">
                        {player.team} · {player.role}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{player.rating.toFixed(1)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              아직 집계된 선수 평점이 없습니다.
            </div>
          )
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-sky-500">{getTeamDisplayName(match.teamA)}</div>
              <div className="mt-2 text-3xl font-black text-sky-700">{match.predictionSummary.teamA}%</div>
            </div>
            <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-violet-500">{getTeamDisplayName(match.teamB)}</div>
              <div className="mt-2 text-3xl font-black text-violet-700">{match.predictionSummary.teamB}%</div>
            </div>
          </div>
        )}

        <Button variant="secondary" className="w-full" onClick={() => onOpen(match.id)}>
          경기 상세 보기
        </Button>
      </CardContent>
    </Card>
  );
}

export function OverviewSection({
  matches,
  onOpen,
}: {
  matches: MatchWithWeek[];
  onOpen: (matchId: string) => void;
}) {
  const highlights = getHomeHighlights(matches);

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Dashboard"
        title="이번 주 핵심 매치 하이라이트"
        description="다가오는 경기의 예측 흐름과 종료 경기의 평점 반응을 빠르게 훑어볼 수 있도록 대표 매치를 묶어 보여줍니다."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {highlights.upcoming[0] ? <HighlightCard match={highlights.upcoming[0]} onOpen={onOpen} /> : null}
        {highlights.finished[0] ? <HighlightCard match={highlights.finished[0]} onOpen={onOpen} /> : null}
      </div>
    </div>
  );
}
