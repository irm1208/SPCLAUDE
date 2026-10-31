export function accountDisplayName(
  username: string | null | undefined,
  discordNames: Readonly<Record<string, string>>,
): string {
  if (!username) return "—";
  const canonical = username.replace(/^@/, "");
  if (!canonical.startsWith("discord:")) return username;
  return discordNames[canonical]?.trim() || "Discord member";
}
