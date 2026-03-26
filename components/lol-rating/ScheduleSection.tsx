import { ChevronDownIcon, ClockIcon } from "./icons";
import { TeamLogo, getTeamDisplayName } from "./team-branding";
import type { WeekSchedule } from "./types";
import { cn, getPredictionStateLabel, getStatusLabel } from "./utils";
import { Badge, Card, CardContent, SectionTitle } from "./ui";

export function ScheduleSection({
  schedule,
  openWeekId,
  activeMatchId,
  onToggleWeek,
  onOpenMatch,
}: {
  schedule: WeekSchedule[];
  openWeekId: string;
  activeMatchId: string;
  onToggleWeek: (weekId: string) => void;
  onOpenMatch: (matchId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Schedule"
        title="주차별 경기 일정"
        description="실제 저장된 경기 데이터를 주차 단위로 탐색하고, 선택한 경기를 곧바로 예측 및 평점 화면으로 연결합니다."
      />
      <div className="space-y-4">
        {schedule.map((week) => {
          const isOpen = openWeekId === week.id;

          return (
            <Card key={week.id}>
              <button className="flex w-full items-center justify-between gap-3 px-5 py-5 text-left sm:px-6" onClick={() => onToggleWeek(week.id)}>
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-950">{week.label}</div>
                  <div className="mt-1 text-sm text-slate-500">{week.matches.length}경기</div>
                </div>
                <ChevronDownIcon className={cn("h-5 w-5 text-slate-500 transition", isOpen && "rotate-180")} />
              </button>

              {isOpen ? (
                <CardContent className="space-y-3 border-t border-slate-100 pt-4">
                  {week.matches.map((match) => {
                    const isActive = activeMatchId === match.id;

                    return (
                      <button
                        key={match.id}
                        onClick={() => onOpenMatch(match.id)}
                        className={cn("w-full rounded-[24px] border p-4 text-left transition sm:p-5", isActive ? "border-sky-300 bg-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]" : "border-slate-200 bg-white hover:bg-slate-50")}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{getStatusLabel(match.status)}</Badge>
                            <Badge variant={match.predictionLocked ? "danger" : "success"}>{getPredictionStateLabel(match)}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <ClockIcon className="h-4 w-4" />
                            {match.date}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_280px] lg:items-center">
                          <div className="flex items-center gap-4">
                            <TeamLogo team={match.teamA} size={58} />
                            <div className="text-lg font-bold text-slate-950 sm:text-xl">{getTeamDisplayName(match.teamA)}</div>
                          </div>
                          <div className="text-center text-xl font-black text-sky-600 sm:text-2xl">{match.score}</div>
                          <div className="flex items-center justify-start gap-4 lg:justify-end">
                            <div className="text-left text-lg font-bold text-slate-950 sm:text-xl lg:text-right">{getTeamDisplayName(match.teamB)}</div>
                            <TeamLogo team={match.teamB} size={58} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-600">예측 {match.predictionSummary.totalVotes.toLocaleString()}</div>
                            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-600">평점 {match.totalRatings.toLocaleString()}</div>
                            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-600">댓글 {match.comments.toLocaleString()}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
