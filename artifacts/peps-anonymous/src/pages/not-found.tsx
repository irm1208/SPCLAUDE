import { useLocation } from "wouter";
import { AlertCircle, Home, ArrowRight } from "lucide-react";
import { TopNav } from "@/components/ui";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--t-bg)" }}>
      <TopNav title="Page Not Found" showBack />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(138,154,170,0.1)" }}>
          <AlertCircle className="w-10 h-10" style={{ color: "#8A9AAA" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-white" style={{ color: "#1A2B3C" }}>404 — Not Found</h1>
        <p className="text-sm mb-8 text-center max-w-sm" style={{ color: "#8A9AAA" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => setLocation("/")}
          className="h-12 px-7 rounded-xl text-sm font-bold text-white flex items-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
          style={{ background: "var(--t-blue)" }}
        >
          <Home className="w-4 h-4" /> Go Home <ArrowRight className="w-4 h-4" />
        </button>
      </main>
    </div>
  );
}
