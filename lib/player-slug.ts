export function normalizeSlugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildPlayerSlug(teamCode: string, playerName: string) {
  const team = normalizeSlugPart(teamCode);
  const name = normalizeSlugPart(playerName);
  const safeName = name || "player";
  return team ? `${team}-${safeName}` : safeName;
}
