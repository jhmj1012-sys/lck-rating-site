import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/authz";
import { getAdminPanelData } from "@/lib/service";
import {
  cancelSeasonPredictionQuestionAction,
  resolveSeasonPredictionQuestionAction,
  saveAdminSetRatingAction,
  toggleCommentVisibilityAction,
  updateMatchRosterAction,
  updateSetRosterAction,
  updateTeamRosterAction,
  upsertSeasonPredictionQuestionAction,
  upsertMatchAction,
  upsertMatchSetAction,
} from "./actions";

function toInputDate(value: string) {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function serializeSeasonOptions(options: { label: string; value: string }[]) {
  return options.map((option) => `${option.label}|${option.value}`).join("\n");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  if (user.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const data = await getAdminPanelData();
  const seasonStatus = readParam(params.seasonStatus) ?? "all";
  const filteredSeasonQuestions = data.seasonPredictionQuestions.filter((question) =>
    seasonStatus === "all" ? true : question.status === seasonStatus,
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">LOL PRO RATING 운영 화면</h1>
            <p className="mt-2 text-sm text-slate-600">寃쎄린 ?앹꽦遺???명듃 寃곌낵, ?명듃 濡쒖뒪?? ?명듃蹂??됱젏 ?낅젰源뚯? ???먮쫫?쇰줈 ?댁쁺?⑸땲??</p>
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
            ?쒕퉬???붾㈃?쇰줈
          </Link>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-bold text-slate-950">??寃쎄린 ?깅줉</h2>
          <form action={upsertMatchAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="matchId" value="" />
            <label className="grid gap-2 text-sm text-slate-700">
              由ш렇
              <input name="league" defaultValue="LCK 2026" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              ?ㅽ뀒?댁?
              <input name="stage" defaultValue="Spring Split" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              ?⑥튂
              <input name="patch" defaultValue="15.7" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              ?곹깭
              <select name="status" defaultValue="scheduled" className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="scheduled">scheduled</option>
                <option value="finished">finished</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              ?쒖옉 ?쒓컖
              <input type="datetime-local" name="scheduledAt" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              Team A
              <select name="teamACode" className="rounded-2xl border border-slate-200 px-4 py-3">
                {data.teams.map((team) => (
                  <option key={`teamA-${team.id}`} value={team.code}>
                    {team.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              Team B
              <select name="teamBCode" className="rounded-2xl border border-slate-200 px-4 py-3">
                {data.teams.map((team) => (
                  <option key={`teamB-${team.id}`} value={team.code}>
                    {team.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              ?덉륫 ?좉툑
              <div className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 px-4">
                <input type="checkbox" name="predictionLocked" />
              </div>
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              Team A ?먯닔
              <input type="number" name="scoreA" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              Team B ?먯닔
              <input type="number" name="scoreB" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white">
                寃쎄린 ?앹꽦
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div>
            <h2 className="text-xl font-bold text-slate-950">시즌예측 관리</h2>
            <p className="mt-2 text-sm text-slate-600">질문 생성, 공개/비공개, 결과 확정, 취소 처리까지 한 번에 관리합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "전체"],
              ["draft", "draft"],
              ["open", "open"],
              ["locked", "locked"],
              ["resolved", "resolved"],
              ["canceled", "canceled"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={value === "all" ? "/admin" : `/admin?seasonStatus=${value}`}
                className={
                  seasonStatus === value
                    ? "rounded-full border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                    : "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                }
              >
                {label}
              </Link>
            ))}
          </div>
          <form action={upsertSeasonPredictionQuestionAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="questionId" value="" />
            <label className="grid gap-2 text-sm text-slate-700">
              제목
              <input name="title" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              카테고리
              <input name="category" defaultValue="LCK" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              시즌
              <input name="season" defaultValue="2026 LCK 정규시즌" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              유형
              <select name="predictionType" defaultValue="single" className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="single">single</option>
                <option value="yesno">yesno</option>
                <option value="range">range</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              공개 상태
              <select name="visibility" defaultValue="public" className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              운영 상태
              <select name="manualStatus" defaultValue="active" className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="canceled">canceled</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              openAt
              <input type="datetime-local" name="openAt" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              closeAt
              <input type="datetime-local" name="closeAt" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700 md:col-span-2 xl:col-span-4">
              설명
              <textarea name="description" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700 md:col-span-2 xl:col-span-4">
              선택지 목록
              <textarea
                name="options"
                rows={5}
                placeholder={"GEN|GEN\nT1|T1\nHLE|HLE"}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white">
                시즌예측 질문 생성
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {filteredSeasonQuestions.map((question) => (
              <div key={question.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{question.category} · {question.season}</div>
                    <div className="mt-1 text-xl font-black text-slate-950">{question.title}</div>
                    <div className="mt-2 text-sm text-slate-600">상태 {question.status} · 공개 {question.visibility} · 참여 {question.totalEntries}명</div>
                  </div>
                  <div className="text-sm text-slate-500">마감 {toInputDate(question.closeAt).replace("T", " ")}</div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <form action={upsertSeasonPredictionQuestionAction} className="rounded-[20px] border border-slate-200 bg-white p-4">
                    <input type="hidden" name="questionId" value={question.id} />
                    <div className="text-sm font-semibold text-slate-950">질문 수정</div>
                    <div className="mt-3 grid gap-3">
                      <input name="title" defaultValue={question.title} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      <input name="category" defaultValue={question.category} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      <input name="season" defaultValue={question.season} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      <select name="predictionType" defaultValue={question.predictionType} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                        <option value="single">single</option>
                        <option value="yesno">yesno</option>
                        <option value="range">range</option>
                      </select>
                      <select name="visibility" defaultValue={question.visibility} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                        <option value="public">public</option>
                        <option value="private">private</option>
                      </select>
                      <select name="manualStatus" defaultValue={question.status === "canceled" ? "canceled" : question.status === "draft" ? "draft" : "active"} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                        <option value="draft">draft</option>
                        <option value="active">active</option>
                        <option value="canceled">canceled</option>
                      </select>
                      <input type="datetime-local" name="openAt" defaultValue={toInputDate(question.openAt)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      <input type="datetime-local" name="closeAt" defaultValue={toInputDate(question.closeAt)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      <textarea name="description" defaultValue={question.description} rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      <textarea name="options" defaultValue={serializeSeasonOptions(question.options)} rows={5} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                    <button type="submit" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
                      질문 수정 저장
                    </button>
                  </form>

                  <form action={resolveSeasonPredictionQuestionAction} className="rounded-[20px] border border-slate-200 bg-white p-4">
                    <input type="hidden" name="questionId" value={question.id} />
                    <div className="text-sm font-semibold text-slate-950">결과 확정</div>
                    <select name="resultOptionId" defaultValue="" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <option value="" disabled>정답 선택</option>
                      {question.options.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <button type="submit" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white">
                      결과 확정
                    </button>
                    {question.resultLabel ? <div className="mt-3 text-sm text-emerald-700">현재 결과 {question.resultLabel}</div> : null}
                  </form>

                  <form action={cancelSeasonPredictionQuestionAction} className="rounded-[20px] border border-slate-200 bg-white p-4">
                    <input type="hidden" name="questionId" value={question.id} />
                    <div className="text-sm font-semibold text-slate-950">취소 처리</div>
                    <p className="mt-2 text-sm text-slate-600">운영상 취소가 필요할 때 질문 상태를 canceled로 전환합니다.</p>
                    <button type="submit" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                      질문 취소
                    </button>
                  </form>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {question.options.map((option) => (
                    <div key={option.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-950">{option.label}</div>
                      <div className="mt-1">{option.voteCount}표 · {option.sharePercent}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-950">寃쎄린蹂??댁쁺</h2>
          {data.matches.map((match) => {
            const teamA = data.teams.find((team) => team.id === match.teamAId);
            const teamB = data.teams.find((team) => team.id === match.teamBId);
            const players = data.players.filter((player) => player.teamId === match.teamAId || player.teamId === match.teamBId);
            const participantIds = new Set(
              data.matchParticipants.filter((participant) => participant.matchId === match.id).map((participant) => participant.playerId),
            );
            const sets = data.matchSets.filter((set) => set.matchId === match.id).sort((a, b) => a.setNumber - b.setNumber);

            return (
              <div key={match.id} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{match.id}</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">
                      {teamA?.code} vs {teamB?.code}
                    </div>
                  </div>
                  <Link href={`/matches/${match.id}`} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
                    ?곸꽭 蹂닿린
                  </Link>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                  <form action={upsertMatchAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <input type="hidden" name="matchId" value={match.id} />
                    <label className="grid gap-2 text-sm text-slate-700">
                      由ш렇
                      <input name="league" defaultValue={match.league} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      ?ㅽ뀒?댁?
                      <input name="stage" defaultValue={match.stage} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      ?⑥튂
                      <input name="patch" defaultValue={match.patch} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      ?곹깭
                      <select name="status" defaultValue={match.status} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <option value="scheduled">scheduled</option>
                        <option value="finished">finished</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      ?쒖옉 ?쒓컖
                      <input
                        type="datetime-local"
                        name="scheduledAt"
                        defaultValue={toInputDate(match.scheduledAt)}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      ?덉륫 ?좉툑
                      <div className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 px-4">
                        <input type="checkbox" name="predictionLocked" defaultChecked={match.predictionLocked} />
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      Team A
                      <select name="teamACode" defaultValue={teamA?.code} className="rounded-2xl border border-slate-200 px-4 py-3">
                        {data.teams.map((team) => (
                          <option key={`existing-teamA-${match.id}-${team.id}`} value={team.code}>
                            {team.code}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      Team B
                      <select name="teamBCode" defaultValue={teamB?.code} className="rounded-2xl border border-slate-200 px-4 py-3">
                        {data.teams.map((team) => (
                          <option key={`existing-teamB-${match.id}-${team.id}`} value={team.code}>
                            {team.code}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      Team A ?먯닔
                      <input type="number" name="scoreA" defaultValue={match.scoreA ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      Team B ?먯닔
                      <input type="number" name="scoreB" defaultValue={match.scoreB ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    </label>
                    <div className="md:col-span-2 xl:col-span-3">
                      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
                        寃쎄린 ???                      </button>
                    </div>
                  </form>

                  <form action={updateMatchRosterAction} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <input type="hidden" name="matchId" value={match.id} />
                    <div className="text-sm font-semibold text-slate-950">경기 로스터</div>
                    <div className="mt-3 grid gap-2">
                      {players.map((player) => (
                        <label key={`${match.id}-${player.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <input type="checkbox" name="playerIds" value={player.id} defaultChecked={participantIds.has(player.id)} />
                          <span className="font-medium">{player.name}</span>
                          <span className="text-slate-500">{player.role}</span>
                        </label>
                      ))}
                    </div>
                    <button type="submit" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
                      寃쎄린 濡쒖뒪?????                    </button>
                  </form>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 text-sm font-semibold text-slate-950">?명듃 異붽?</div>
                  <form action={upsertMatchSetAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <input type="hidden" name="matchId" value={match.id} />
                    <label className="grid gap-2 text-sm text-slate-700">
                      ?명듃 踰덊샇
                      <input name="setNumber" type="number" defaultValue={sets.length + 1} className="rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      ?밸━ ?
                      <select name="winnerTeamCode" defaultValue={teamA?.code} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <option value={teamA?.code}>{teamA?.code}</option>
                        <option value={teamB?.code}>{teamB?.code}</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      寃쎄린 ?쒓컙(遺?
                      <input name="durationMinutes" type="number" className="rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700 xl:col-span-2">
                      ?명듃 硫붾え
                      <input name="note" className="rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    </label>
                    <div className="md:col-span-2 xl:col-span-5">
                      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white">
                        ?명듃 異붽?
                      </button>
                    </div>
                  </form>
                </div>

                <div className="space-y-4">
                  {sets.map((set) => {
                    const setParticipants = new Set(
                      data.setParticipants.filter((participant) => participant.matchSetId === set.id).map((participant) => participant.playerId),
                    );
                    const setRatings = data.setPlayerRatings.filter((rating) => rating.matchSetId === set.id);
                    const winnerTeam = data.teams.find((team) => team.id === set.winnerTeamId);

                    return (
                      <div key={set.id} className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <div className="space-y-4">
                          <form action={upsertMatchSetAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <input type="hidden" name="matchId" value={match.id} />
                            <input type="hidden" name="setId" value={set.id} />
                            <label className="grid gap-2 text-sm text-slate-700">
                              ?명듃 踰덊샇
                              <input name="setNumber" type="number" defaultValue={set.setNumber} className="rounded-2xl border border-slate-200 px-4 py-3" />
                            </label>
                            <label className="grid gap-2 text-sm text-slate-700">
                              ?밸━ ?
                              <select name="winnerTeamCode" defaultValue={winnerTeam?.code} className="rounded-2xl border border-slate-200 px-4 py-3">
                                <option value={teamA?.code}>{teamA?.code}</option>
                                <option value={teamB?.code}>{teamB?.code}</option>
                              </select>
                            </label>
                            <label className="grid gap-2 text-sm text-slate-700">
                              寃쎄린 ?쒓컙(遺?
                              <input name="durationMinutes" type="number" defaultValue={set.durationMinutes ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3" />
                            </label>
                            <label className="grid gap-2 text-sm text-slate-700">
                              硫붾え
                              <input name="note" defaultValue={set.note} className="rounded-2xl border border-slate-200 px-4 py-3" />
                            </label>
                            <div className="md:col-span-2 xl:col-span-4">
                              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
                                ?명듃 ???                              </button>
                            </div>
                          </form>

                          <form action={updateSetRosterAction} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <input type="hidden" name="setId" value={set.id} />
                            <div className="text-sm font-semibold text-slate-950">세트 {set.setNumber} 로스터</div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {players.map((player) => (
                                <label key={`${set.id}-${player.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                                  <input type="checkbox" name="playerIds" value={player.id} defaultChecked={setParticipants.has(player.id)} />
                                  <span className="font-medium">{player.name}</span>
                                  <span className="text-slate-500">{player.role}</span>
                                </label>
                              ))}
                            </div>
                            <button type="submit" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
                              ?명듃 濡쒖뒪?????                            </button>
                          </form>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm font-semibold text-slate-950">?명듃 {set.setNumber} 愿由ъ옄 ?됱젏</div>
                          <div className="mt-3 space-y-3">
                            {players.map((player) => {
                              const existing = setRatings.find((rating) => rating.playerId === player.id && rating.userId === user.id);
                              return (
                                <form key={`${set.id}-${player.id}`} action={saveAdminSetRatingAction} className="rounded-2xl border border-slate-200 bg-white p-3">
                                  <input type="hidden" name="setId" value={set.id} />
                                  <input type="hidden" name="playerId" value={player.id} />
                                  <div className="mb-2 text-sm font-medium text-slate-900">{player.name}</div>
                                  <div className="grid gap-2">
                                    <input
                                      name="score"
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="10"
                                      defaultValue={existing?.score ?? ""}
                                      placeholder="?됱젏"
                                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                                    />
                                    <input
                                      name="comment"
                                      defaultValue={existing?.comment ?? ""}
                                      placeholder="코멘트"
                                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                                    />
                                  </div>
                                  <button type="submit" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 px-3 text-sm font-medium text-slate-700">
                                    ???                                  </button>
                                </form>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">2026 R1 팀 로스터 관리</h2>
              <p className="mt-2 text-sm text-slate-600">공식 1군 로스터를 기준으로 팀별 엔트리를 조정하고, 팀 페이지에 즉시 반영할 수 있습니다.</p>
            </div>
            <Link href="/teams" className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              팀 페이지 보기
            </Link>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {data.teams.map((team) => {
              const rosterEntries = data.teamRosterEntries.filter((entry) => entry.teamId === team.id);
              const teamPlayers = data.players.filter((player) => player.teamId === team.id);
              const selectedIds = new Set(rosterEntries.filter((entry) => entry.isMainRoster).map((entry) => entry.playerId));

              return (
                <form key={team.id} action={updateTeamRosterAction} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <input type="hidden" name="teamCode" value={team.code} />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{team.code}</div>
                      <div className="mt-1 text-lg font-bold text-slate-950">{team.name}</div>
                    </div>
                    <div className="text-xs text-slate-500">선택 {selectedIds.size}명</div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {teamPlayers.map((player) => (
                      <label key={`${team.id}-${player.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <span>
                          <span className="font-medium text-slate-900">{player.name}</span>
                          <span className="ml-2 text-slate-500">{player.role}</span>
                        </span>
                        <input type="checkbox" name="playerIds" value={player.id} defaultChecked={selectedIds.has(player.id)} />
                      </label>
                    ))}
                  </div>

                  <button type="submit" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
                    팀 로스터 저장
                  </button>
                </form>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-bold text-slate-950">댓글 공개 상태 관리</h2>
          <div className="mt-5 space-y-3">
            {data.comments.map((comment) => {
              const author = data.users.find((item) => item.id === comment.userId);
              return (
                <div key={comment.id} className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{author?.name ?? comment.userId}</div>
                    <div className="mt-1 text-sm text-slate-600">{comment.text}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {comment.matchId} 쨌 {comment.hidden ? "?④? ?곹깭" : "怨듦컻 ?곹깭"}
                    </div>
                  </div>
                  <form action={toggleCommentVisibilityAction}>
                    <input type="hidden" name="commentId" value={comment.id} />
                    <input type="hidden" name="hidden" value={comment.hidden ? "false" : "true"} />
                    <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
                      {comment.hidden ? "怨듦컻濡??꾪솚" : "?④? 泥섎━"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}




