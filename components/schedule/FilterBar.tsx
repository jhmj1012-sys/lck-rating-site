'use client';

import type { MatchMonthGroup, MatchWeekGroup } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

type StatusValue = "all" | "scheduled" | "finished";

function compactWeekLabel(label: string) {
  return label.replace(/^\s*\d+\s*주차\s*/u, "").trim();
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
    <label className="flex min-w-[120px] items-center gap-2 font-sans">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#d6d6e5]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-8 w-full rounded-lg border-0 bg-[#31313C] px-2.5 text-sm text-white outline-none transition",
          "hover:border-0 focus:border-0 focus:ring-0",
          disabled ? "cursor-not-allowed bg-[#3A3A47] text-[#9fa8b8]" : "",
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
}: ScheduleFilterBarProps) {
  return (
    <div className="rounded-2xl border-0 bg-[#3A3A47] px-3 py-2.5 font-sans">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-8 items-center rounded-lg border-0 bg-[#31313C] p-0.5">
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
                    ? "bg-[#5383E8] text-white"
                    : "text-[#d6d6e5] hover:bg-[#4A4A59] hover:text-white",
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

      </div>
    </div>
  );
}
