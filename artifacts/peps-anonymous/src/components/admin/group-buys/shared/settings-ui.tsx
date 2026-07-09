import React from "react";
import { cn } from "@/components/ui";

/** iOS-style switch matching the reference design (black pill, white knob). */
export function Switch({ checked, onChange, disabled, busy }: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || busy}
      onClick={onChange}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60",
        checked ? "bg-foreground" : "bg-muted-foreground/25",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
          busy && "animate-pulse",
        )}
      />
    </button>
  );
}

/** Section header with hairline divider, like "My Profile" / "Account Security" in the reference. */
export function SettingsSection({ title, description, children, actions }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="space-y-0">
      <div className="flex items-end justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="divide-y divide-border/70">
        {children}
      </div>
    </section>
  );
}

/** Label-left / control-right row, like "2-Step Verifications" in the reference. */
export function SettingsRow({ label, description, children, stacked }: {
  label: string;
  description?: string;
  children?: React.ReactNode;
  /** stacked = control renders full-width under the label (for textareas, editors) */
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="py-4 space-y-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="py-4 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 flex items-center gap-2">{children}</div>
    </div>
  );
}
