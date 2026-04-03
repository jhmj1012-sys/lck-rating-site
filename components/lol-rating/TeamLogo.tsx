import Image from "next/image";

import { getTeamDisplayName, normalizeTeamName } from "@/components/lol-rating/team-branding";
import { cn } from "@/components/lol-rating/utils";

type TeamLogoProps = {
  team: string;
  size?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function TeamLogo({ team, size = 32, className, imageClassName, priority = false }: TeamLogoProps) {
  const normalizedTeam = normalizeTeamName(team);

  if (!normalizedTeam) {
    return null;
  }

  const label = getTeamDisplayName(team);

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/teams/${normalizedTeam}.svg`}
        alt={`${label} logo`}
        fill
        priority={priority}
        sizes={`${size}px`}
        className={cn("object-contain p-1.5", imageClassName)}
      />
    </span>
  );
}
