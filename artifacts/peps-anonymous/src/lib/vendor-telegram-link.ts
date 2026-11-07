export type VendorTelegramDestination = "personal" | "group";

export function vendorTelegramLinks(botUsername: string | null | undefined, token: string) {
  if (!botUsername || !/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(botUsername)
    || typeof token !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
    throw new Error("Telegram connection details are unavailable. Please try again.");
  }
  const base = `https://t.me/${botUsername}`;
  return { personal: `${base}?start=${token}`, group: `${base}?startgroup=${token}` };
}
