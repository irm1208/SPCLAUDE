import { useLocation, useSearch } from "wouter";
import { SageChat } from "@/components/SageChat";
import { useThemeStore } from "@/hooks/use-theme";
import { palette, ACCENT } from "@/components/DashboardShell";

export default function SagePage() {
  const { dark } = useThemeStore();
  const T = palette(dark);
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const seedQ = decodeURIComponent(params.get("q") ?? "");
  const openHistory = params.get("history") === "1";

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: T.panel2 }}>
      <SageChat
        open={true}
        onClose={() => { if (window.history.length > 1) window.history.back(); else navigate("/account"); }}
        seed={seedQ || undefined}
        openToHistory={openHistory}
        t={T}
        accent={ACCENT}
        fullPage={true}
      />
    </div>
  );
}
