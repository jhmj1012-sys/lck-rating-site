'use client';

import { useCallback, useMemo, useState } from "react";

import { canSelectPlayer, createChallengeSummary } from "@/lib/games/budget-challenge-utils";
import type { ChallengeConfig, ChallengePlayer, ChallengeSelection } from "@/lib/games/budget-challenge-types";

export function useBudgetChallenge({
  config,
  players,
  initialSelection,
}: {
  config: ChallengeConfig;
  players: ChallengePlayer[];
  initialSelection?: ChallengeSelection;
}) {
  const [selection, setSelection] = useState<ChallengeSelection>(initialSelection ?? {});

  const playersById = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const summary = useMemo(() => createChallengeSummary(config, selection, playersById), [config, selection, playersById]);

  const getSelectionAvailability = useCallback(
    (player: ChallengePlayer) =>
      canSelectPlayer({
        config,
        selection,
        playersById,
        player,
      }),
    [config, playersById, selection],
  );

  const togglePlayer = useCallback(
    (player: ChallengePlayer) => {
      const currentId = selection[player.position];
      if (currentId === player.id) {
        setSelection((prev) => {
          const next = { ...prev };
          delete next[player.position];
          return next;
        });
        return;
      }

      const availability = getSelectionAvailability(player);
      if (!availability.canSelect) {
        return;
      }

      setSelection((prev) => ({
        ...prev,
        [player.position]: player.id,
      }));
    },
    [getSelectionAvailability, selection],
  );

  const resetSelection = useCallback(() => {
    setSelection({});
  }, []);

  return {
    selection,
    setSelection,
    summary,
    playersById,
    getSelectionAvailability,
    togglePlayer,
    resetSelection,
  };
}
