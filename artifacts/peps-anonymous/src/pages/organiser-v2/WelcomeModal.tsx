import { Sparkles, X, Rocket, Users, ShoppingBag, TrendingUp } from "lucide-react";
import { V2_CARD_BORDER } from "./theme";

// ─── Welcome Modal for First-Time Users ──────────────────────────────────────
// Shows when a novice first opens the GB organizer. Explains what the tool does
// and guides them to the setup wizard.

interface WelcomeModalProps {
  onStart: () => void;
  onDismiss: () => void;
}

export default function WelcomeModal({ onStart, onDismiss }: WelcomeModalProps) {
  const handleStart = () => {
    localStorage.setItem("v2:welcomeDismissed", "true");
    onStart();
  };

  const handleDismiss = () => {
    localStorage.setItem("v2:welcomeDismissed", "true");
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 space-y-6" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FC" }}>
              <Sparkles className="w-6 h-6" style={{ color: "var(--t-blue)" }} />
            </div>
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-bold" style={{ color: "var(--t-text)" }}>
                Welcome to GB Organizer!
              </h2>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                Your control center for running group buys
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 shrink-0">
            <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          </button>
        </div>

        {/* What you can do */}
        <div>
          <h3 className="text-[15px] font-bold mb-3" style={{ color: "var(--t-text)" }}>
            What you can do here:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              icon={ShoppingBag}
              title="Accept Orders"
              description="Collect orders from your members with custom products and pricing"
              color="#0078D4"
            />
            <FeatureCard
              icon={Users}
              title="Manage Members"
              description="Track who's joined, handle payments, and communicate updates"
              color="#8B5CF6"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Track Everything"
              description="Monitor orders, revenue, shipping status, and lab testing contributions"
              color="#16A34A"
            />
            <FeatureCard
              icon={Rocket}
              title="Ship & Dispatch"
              description="Coordinate international shipping with package forwarders and tracking"
              color="#EA580C"
            />
          </div>
        </div>

        {/* Getting started */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#F0F9FF", border: `1px solid #BAE6FD` }}>
          <h3 className="text-[14px] font-bold" style={{ color: "#0369A1" }}>
            ✨ Getting Started
          </h3>
          <p className="text-[14px]" style={{ color: "#075985" }}>
            We'll walk you through 7 quick steps to set up your first group buy. It takes about <strong>5 minutes</strong> and you can save your progress at any time.
          </p>
          <div className="flex flex-wrap gap-2 text-[13px] font-medium" style={{ color: "#0369A1" }}>
            <span className="px-2 py-1 rounded-md" style={{ background: "#fff" }}>1. Basic Info</span>
            <span className="px-2 py-1 rounded-md" style={{ background: "#fff" }}>2. Products</span>
            <span className="px-2 py-1 rounded-md" style={{ background: "#fff" }}>3. Shipping</span>
            <span className="px-2 py-1 rounded-md" style={{ background: "#fff" }}>4. Payments</span>
            <span className="px-2 py-1 rounded-md" style={{ background: "#fff" }}>5. Access</span>
            <span className="px-2 py-1 rounded-md" style={{ background: "#fff" }}>6. Rules</span>
            <span className="px-2 py-1 rounded-md" style={{ background: "#fff" }}>7. Launch!</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleStart}
            className="flex-1 h-12 rounded-lg text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-colors"
            style={{ background: "var(--t-blue)" }}
          >
            <Rocket className="w-4 h-4" />
            Take the Guided Tour
          </button>
          <button
            onClick={handleDismiss}
            className="sm:w-32 h-12 rounded-lg text-[14px] font-semibold transition-colors"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
          >
            Skip for Now
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }: {
  icon: typeof ShoppingBag;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="rounded-lg p-3 space-y-2" style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h4 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>{title}</h4>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-subtle)" }}>
        {description}
      </p>
    </div>
  );
}
