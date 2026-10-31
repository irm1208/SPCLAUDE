export const ACCOUNT_TYPES = ["all", "discord", "telegram", "non_telegram"] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];
export function matchesAccountType(account: {
  telegramUsername: string;
  discordId?: string | null;
  telegramConnected?: boolean;
}, type: AccountType) {
  if (type === "discord") return Boolean(account.discordId) || /^@?discord:\d+$/i.test(account.telegramUsername);
  if (type === "telegram") return account.telegramConnected === true;
  if (type === "non_telegram") return account.telegramConnected !== true;
  return true;
}
