'use client';

import type { MatchMonthGroup, MatchWeekGroup } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type StatusValue = "all" | "scheduled" | "finished";

function compactWeekLabel(label: string) {
  return label.replace(/^\s*\d+\s*월\s*/u, "").trim();
}

interface ScheduleFilterBarProps {
  league: string;
  leagues: string[];
  onLeagueChange: (value: string) => void;
  status: StatusValue;
  onStatusChange: (value: StatusValue) => void;
  monthOptions: MatchMonthGroup[];
  selectedMonthId: string;
  onMonthChange: (value: string) => void;
  weekOptions: MatchWeekGroup[];
  selectedWeekId: string;
  onWeekChange: (value: string) => void;
  revealSpoilers: boolean;
  onToggleSpoilers: () => void;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-[120px] items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none transition",
          "hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70",
          disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ScheduleFilterBar({
  league,
  leagues,
  onLeagueChange,
  status,
  onStatusChange,
  monthOptions,
  selectedMonthId,
  onMonthChange,
  weekOptions,
  selectedWeekId,
  onWeekChange,
  revealSpoilers,
  onToggleSpoilers,
}: ScheduleFilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[
              { value: "all", label: "전체" },
              { value: "scheduled", label: "예정" },
              { value: "finished", label: "종료" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onStatusChange(item.value as StatusValue)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition",
                  status === item.value
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <FilterSelect
            label="리그"
            value={league}
            onChange={onLeagueChange}
            options={leagues.map((item) => ({ value: item, label: item === "all" ? "전체 리그" : item }))}
          />

          <FilterSelect
            label="월"
            value={selectedMonthId}
            onChange={onMonthChange}
            options={monthOptions.map((month) => ({ value: month.id, label: month.label }))}
          />

          <FilterSelect
            label="주차"
            value={selectedWeekId}
            onChange={onWeekChange}
            disabled={weekOptions.length === 0}
            options={
              weekOptions.length > 0
                ? weekOptions.map((week) => ({ value: week.id, label: compactWeekLabel(week.label) }))
                : [{ value: "", label: "주차 선택" }]
            }
          />
        </div>

        <div className="flex justify-end md:pl-3">
          <button
            type="button"
            onClick={onToggleSpoilers}
            aria-label="일정 스코어 스포일러 방지 토글"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
          >
            <span>스포일러 방지</span>
            <span
              className={cn(
                "relative h-5 w-10 rounded-full transition",
                revealSpoilers ? "bg-slate-300" : "bg-slate-800",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                  revealSpoilers ? "left-0.5" : "left-[22px]",
                )}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
