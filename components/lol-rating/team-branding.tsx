import { cn } from "./utils";

export type TeamId = "T1" | "GEN" | "KT" | "KRX" | "HLE" | "DK" | "NS" | "BRO" | "BFX" | "DNS";

type TeamMeta = {
  id: TeamId;
  name: string;
  logoText: string;
  sub: string;
  primary: string;
  bg: string;
  shape: "shield" | "hex" | "bolt" | "octa" | "flame" | "shield2" | "circle" | "diamond" | "octa2";
};

export const TEAM_BRANDING: Record<TeamId, TeamMeta> = {
  T1: { id: "T1", name: "T1", logoText: "T1", sub: "ESPORTS", primary: "#C8102E", bg: "#0A0002", shape: "shield" },
  GEN: { id: "GEN", name: "Gen.G", logoText: "GEN", sub: "GEN.G", primary: "#C9A227", bg: "#090703", shape: "hex" },
  KT: { id: "KT", name: "KT", logoText: "KT", sub: "ROLSTER", primary: "#E4002B", bg: "#080003", shape: "bolt" },
  KRX: { id: "KRX", name: "KRX", logoText: "KRX", sub: "KRX", primary: "#1C6EAF", bg: "#020810", shape: "octa" },
  HLE: { id: "HLE", name: "HLE", logoText: "HLE", sub: "HANWHA", primary: "#E84F1C", bg: "#0A0300", shape: "flame" },
  DK: { id: "DK", name: "DK", logoText: "DK", sub: "DPLUS KIA", primary: "#003DA5", bg: "#01020A", shape: "hex" },
  NS: { id: "NS", name: "NS", logoText: "NS", sub: "REDFORCE", primary: "#E4002B", bg: "#080003", shape: "shield2" },
  BRO: { id: "BRO", name: "BRION", logoText: "BRO", sub: "OKSavingsBank", primary: "#00A99D", bg: "#010A09", shape: "circle" },
  BFX: { id: "BFX", name: "BFX", logoText: "BFX", sub: "BNK FEARX", primary: "#7B2FBE", bg: "#05020A", shape: "diamond" },
  DNS: { id: "DNS", name: "DN FREECS", logoText: "DNS", sub: "DN FREECS", primary: "#00AAFF", bg: "#010609", shape: "octa2" },
};

export function normalizeTeamName(team: string): TeamId | null {
  const normalized = team.trim().toUpperCase().replace(/\./g, "");
  const aliases: Record<string, TeamId> = {
    T1: "T1",
    GEN: "GEN",
    GENG: "GEN",
    KT: "KT",
    DRX: "KRX",
    KRX: "KRX",
    HLE: "HLE",
    DK: "DK",
    NS: "NS",
    BRO: "BRO",
    BFX: "BFX",
    DNS: "DNS",
    "GEN.G": "GEN",
    DNF: "DNS",
  };

  return aliases[normalized] ?? null;
}

export function getTeamDisplayName(team: string) {
  const teamId = normalizeTeamName(team);
  return teamId ? TEAM_BRANDING[teamId].name : team;
}

function diamond(cx: number, cy: number, r: number, fill: string, opacity = 1) {
  return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} fill={fill} opacity={opacity} />;
}

function Hexagon({ cx, cy, r, fill, stroke, strokeWidth }: { cx: number; cy: number; r: number; fill: string; stroke: string; strokeWidth: number }) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = ((index * 60) - 30) * (Math.PI / 180);
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");

  return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

export function TeamLogo({
  team,
  size = 44,
  className,
}: {
  team: string;
  size?: number;
  className?: string;
}) {
  const teamId = normalizeTeamName(team);

  if (!teamId) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 font-black text-slate-700", className)} style={{ width: size, height: size }}>
        {team.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  const meta = TEAM_BRANDING[teamId];
  const s = size;
  const h = size * 1.28;
  const cx = s / 2;
  const cy = s * 0.48;
  const strokeWidth = s * 0.022;
  const innerWidth = s * 0.006;
  const logoFont = meta.logoText.length <= 2 ? s * 0.34 : meta.logoText.length === 3 ? s * 0.23 : s * 0.19;
  const logoLetterSpacing = meta.logoText.length <= 2 ? s * 0.01 : meta.logoText.length === 3 ? s * 0.028 : s * 0.02;
  const subFont = s * 0.062;
  const subLetterSpacing = s * 0.012;
  const divY = cy + s * 0.52;

  return (
    <div
      className={cn("overflow-hidden rounded-[22px] border border-slate-200/70 bg-white/80 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]", className)}
      style={{ width: size + 12, height: h + 12 }}
    >
      <svg viewBox={`0 0 ${s} ${h}`} width={size} height={h} aria-label={meta.name} role="img">
        {meta.shape === "shield" || meta.shape === "shield2" ? (
          <>
            <path d={`M${cx} ${s * 0.06} L${s * 0.96} ${s * 0.25} L${s * 0.96} ${s * 0.68} Q${s * 0.96} ${h * 0.87} ${cx} ${h * 0.96} Q${s * 0.04} ${h * 0.87} ${s * 0.04} ${s * 0.68} L${s * 0.04} ${s * 0.25} Z`} fill={meta.bg} stroke={meta.primary} strokeWidth={strokeWidth} />
            <path d={`M${cx} ${s * 0.14} L${s * 0.88} ${s * 0.31} L${s * 0.88} ${s * 0.67} Q${s * 0.88} ${h * 0.81} ${cx} ${h * 0.88} Q${s * 0.12} ${h * 0.81} ${s * 0.12} ${s * 0.67} L${s * 0.12} ${s * 0.31} Z`} fill="none" stroke={meta.primary} strokeWidth={innerWidth} strokeOpacity="0.35" />
            <path d={`M${cx} ${s * 0.06} L${s * 0.96} ${s * 0.25} L${s * 0.96} ${s * 0.33} Q${s * 0.7} ${s * 0.3} ${cx} ${s * 0.29} Q${s * 0.3} ${s * 0.3} ${s * 0.04} ${s * 0.33} L${s * 0.04} ${s * 0.25} Z`} fill={meta.primary} opacity="0.85" />
            {diamond(cx, s * 0.06, s * 0.035, meta.primary, 0.9)}
            {diamond(cx, h * 0.94, s * 0.028, meta.primary, 0.6)}
          </>
        ) : null}

        {meta.shape === "hex" ? (
          <>
            <Hexagon cx={cx} cy={cy} r={s * 0.46} fill={meta.bg} stroke={meta.primary} strokeWidth={strokeWidth} />
            <Hexagon cx={cx} cy={cy} r={s * 0.396} fill="none" stroke={meta.primary} strokeWidth={innerWidth} />
          </>
        ) : null}

        {meta.shape === "bolt" ? (
          <>
            <circle cx={cx} cy={cy} r={s * 0.46} fill={meta.bg} stroke={meta.primary} strokeWidth={strokeWidth} />
            <circle cx={cx} cy={cy} r={s * 0.39} fill="none" stroke={meta.primary} strokeWidth={innerWidth} strokeOpacity="0.3" />
          </>
        ) : null}

        {meta.shape === "octa" || meta.shape === "octa2" ? (
          <>
            <polygon
              points={`${s * 0.22},${s * 0.04} ${s * 0.78},${s * 0.04} ${s * 0.96},${s * 0.22} ${s * 0.96},${s * 0.64} ${s * 0.78},${h * 0.96} ${s * 0.22},${h * 0.96} ${s * 0.04},${s * 0.64} ${s * 0.04},${s * 0.22}`}
              fill={meta.bg}
              stroke={meta.primary}
              strokeWidth={strokeWidth}
            />
            <polygon
              points={`${s * 0.28},${s * 0.1} ${s * 0.72},${s * 0.1} ${s * 0.9},${s * 0.28} ${s * 0.9},${s * 0.64} ${s * 0.72},${h * 0.9} ${s * 0.28},${h * 0.9} ${s * 0.1},${s * 0.64} ${s * 0.1},${s * 0.28}`}
              fill="none"
              stroke={meta.primary}
              strokeWidth={innerWidth}
              strokeOpacity="0.3"
            />
          </>
        ) : null}

        {meta.shape === "flame" ? (
          <>
            <path d={`M${cx} ${s * 0.06} L${s * 0.88} ${s * 0.24} L${s * 0.96} ${s * 0.28} L${s * 0.96} ${s * 0.68} Q${s * 0.96} ${h * 0.87} ${cx} ${h * 0.96} Q${s * 0.04} ${h * 0.87} ${s * 0.04} ${s * 0.68} L${s * 0.04} ${s * 0.28} L${s * 0.12} ${s * 0.24} Z`} fill={meta.bg} stroke={meta.primary} strokeWidth={strokeWidth} />
            <path d={`M${cx} ${s * 0.06} L${s * 0.12} ${s * 0.24} L${cx - s * 0.06} ${s * 0.18} L${cx} ${s * 0.08} L${cx + s * 0.06} ${s * 0.18} L${s * 0.88} ${s * 0.24} Z`} fill={meta.primary} opacity="0.7" />
          </>
        ) : null}

        {meta.shape === "circle" ? (
          <>
            <circle cx={cx} cy={cy} r={s * 0.46} fill={meta.bg} stroke={meta.primary} strokeWidth={strokeWidth} />
            <circle cx={cx} cy={cy} r={s * 0.39} fill="none" stroke={meta.primary} strokeWidth={innerWidth} strokeOpacity="0.3" />
          </>
        ) : null}

        {meta.shape === "diamond" ? (
          <>
            <path d={`M${cx} ${s * 0.04} L${s * 0.92} ${cy} L${cx} ${h * 0.96} L${s * 0.08} ${cy} Z`} fill={meta.bg} stroke={meta.primary} strokeWidth={strokeWidth} />
            <path d={`M${cx} ${s * 0.12} L${s * 0.84} ${cy} L${cx} ${h * 0.88} L${s * 0.16} ${cy} Z`} fill="none" stroke={meta.primary} strokeWidth={innerWidth} strokeOpacity="0.35" />
          </>
        ) : null}

        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Impact, Arial Black, sans-serif"
          fontSize={logoFont}
          fontWeight="900"
          fill="white"
          letterSpacing={logoLetterSpacing}
        >
          {meta.logoText}
        </text>
        <line x1={cx - s * 0.38} y1={divY} x2={cx + s * 0.38} y2={divY} stroke={meta.primary} strokeWidth={s * 0.007} strokeOpacity="0.6" />
        {diamond(cx, divY, s * 0.022, meta.primary, 0.8)}
        <text
          x={cx}
          y={divY + s * 0.12}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Arial, sans-serif"
          fontSize={subFont}
          fontWeight="700"
          fill={meta.primary}
          letterSpacing={subLetterSpacing}
        >
          {meta.sub}
        </text>
      </svg>
    </div>
  );
}


