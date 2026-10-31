export type AccountType = "all" | "discord" | "telegram" | "non_telegram";

export function AccountTypeFilter({ value, onChange }: { value: AccountType; onChange: (value: AccountType) => void }) {
  return <select aria-label="Account connection" value={value}
    onChange={event => onChange(event.target.value as AccountType)}
    className="h-9 rounded-lg border bg-background px-3 text-xs font-medium text-foreground flex-1 min-w-[160px]">
    <option value="all">All account types</option>
    <option value="discord">Discord accounts</option>
    <option value="telegram">Telegram linked</option>
    <option value="non_telegram">No Telegram link</option>
  </select>;
}
