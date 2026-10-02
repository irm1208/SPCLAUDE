export type SetupAccount = {
  telegramUsername: string;
  hasPassword?: boolean;
  discordLinked?: boolean;
};

export type DiscordSetupStep = "password" | "username" | "complete";

export function getDiscordSetupStep(account: SetupAccount | null | undefined): DiscordSetupStep {
  if (account?.discordLinked !== true || typeof account.hasPassword !== "boolean") return "complete";
  if (!account.hasPassword) return "password";
  return account.telegramUsername.replace(/^@/, "").startsWith("discord:")
    ? "username" : "complete";
}

export async function submitDiscordSetup(
  step: Exclude<DiscordSetupStep, "complete">,
  fields: { password?: string; newUsername?: string; currentPassword?: string },
  request: (url: string, options: RequestInit) => Promise<Response> = fetch,
): Promise<{ ok: boolean; newUsername?: string }> {
  const path = step === "password" ? "set-password" : "change-username";
  const body = step === "password"
    ? { password: fields.password }
    : { newUsername: fields.newUsername, currentPassword: fields.currentPassword };
  const response = await request(`/api/account/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || "Could not save your login details");
  }
  return result;
}