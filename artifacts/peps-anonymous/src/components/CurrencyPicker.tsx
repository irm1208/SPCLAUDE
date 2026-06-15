import React from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useDisplayCurrency, CURRENCY_SYMBOLS, type DisplayCurrency } from "@/hooks/use-currency";

const OPTIONS: { value: DisplayCurrency; name: string }[] = [
  { value: "GBP", name: "GBP" },
  { value: "USD", name: "USD" },
  { value: "EUR", name: "EUR" },
];

export function CurrencyPicker() {
  const { currency, setCurrency, symbol } = useDisplayCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg border text-[12px] font-bold transition-all focus:outline-none"
          style={{
            background: "var(--t-surface2)",
            borderColor: "var(--t-border)",
            color: "var(--t-text)",
          }}
        >
          {symbol}
          <ChevronDown className="w-3 h-3 ml-0.5" style={{ color: "var(--t-muted)" }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[80px] z-[200]">
        {OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setCurrency(opt.value)}
            className="flex items-center justify-between gap-2 cursor-pointer text-[12px] font-semibold"
          >
            <span>{CURRENCY_SYMBOLS[opt.value]} {opt.name}</span>
            {currency === opt.value && <Check className="w-3 h-3 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
