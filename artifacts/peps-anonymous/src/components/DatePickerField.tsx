import React, { useState, useEffect } from "react";

interface DatePickerFieldProps {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}

function ymdToDmy(ymd: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function dmyToYmd(dmy: string): string | null {
  const trimmed = dmy.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const d = match[1].padStart(2, "0");
  const m = match[2].padStart(2, "0");
  const y = match[3];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() + 1 !== Number(m) ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  return `${y}-${m}-${d}`;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  style,
  className,
}: DatePickerFieldProps) {
  const [text, setText] = useState<string>(() => ymdToDmy(value));

  useEffect(() => {
    setText(ymdToDmy(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setText(raw);
    const ymd = dmyToYmd(raw);
    if (ymd !== null) {
      onChange(ymd);
    }
  }

  function handleBlur() {
    const ymd = dmyToYmd(text);
    if (ymd !== null) {
      setText(ymdToDmy(ymd));
      onChange(ymd);
    } else if (!text.trim()) {
      onChange("");
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder ?? "DD/MM/YYYY"}
      className={className}
      style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontWeight: 500, ...style }}
    />
  );
}
