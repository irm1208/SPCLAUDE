import React, { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  MessageCircle, ChevronDown, ArrowRight, Users,
  Home, BookOpen, Calculator, User,
} from "lucide-react";

function TopNav() {
  return (
    <div
      className="flex items-center justify-between px-4 h-12 shrink-0"
      style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-sm font-bold text-white tracking-wide">Salt &amp; Peps</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {}}
          className="text-xs font-semibold text-slate-300 flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <User className="w-3 h-3" /> Login
        </button>
        <span className="text-xs font-bold text-white px-2 py-1 rounded-lg" style={{ background: "#3B82F6" }}>USD</span>
      </div>
    </div>
  );
}

function BottomTabs() {
  return (
    <div
      className="fixed bottom-0 inset-x-0 flex h-14 border-t"
      style={{ background: "#0F172A", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {[
        { icon: Home, label: "Home", active: true },
        { icon: BookOpen, label: "Protocols", active: false },
        { icon: Calculator, label: "Calc", active: false },
        { icon: User, label: "Account", active: false },
      ].map(({ icon: Icon, label, active }) => (
        <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-500"}`} />
          <span className={`text-[10px] font-semibold ${active ? "text-blue-400" : "text-slate-500"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

type Card = {
  id: string;
  icon: React.ElementType;
  accentColor: string;
  badgeLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaBg: string;
  bg: string;
  border: string;
};

const CARDS: Card[] = [
  {
    id: "order",
    icon: ShoppingBag,
    accentColor: "#60A5FA",
    badgeLabel: "New Customer",
    title: "Place an order",
    description: "Browse 126+ peptide products and submit your order for the next group buy.",
    ctaLabel: "Group Buy Login",
    ctaBg: "linear-gradient(135deg, #3B82F6, #2563EB)",
    bg: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)",
    border: "rgba(59,130,246,0.2)",
  },
  {
    id: "manage",
    icon: Search,
    accentColor: "#FCA5A1",
    badgeLabel: "Returning",
    title: "Manage your order",
    description: "Track, edit, pay, or upload your InPost QR code for any existing order.",
    ctaLabel: "My Orders",
    ctaBg: "linear-gradient(135deg, #EA580C, #C2410C)",
    bg: "linear-gradient(180deg, #1A2B3C 0%, #2D4A5E 100%)",
    border: "rgba(234,88,12,0.18)",
  },
  {
    id: "lab",
    icon: TestTube,
    accentColor: "#22D3EE",
    badgeLabel: "Quality Assurance",
    title: "Lab Reports",
    description: "Independent Janoshik CoA tests — 352+ reports from supplier Uther.",
    ctaLabel: "Browse Lab Results",
    ctaBg: "linear-gradient(135deg, #0EA5E9, #0284C7)",
    bg: "linear-gradient(180deg, #0A1628 0%, #0F2240 100%)",
    border: "rgba(34,211,238,0.15)",
  },
  {
    id: "safety",
    icon: ShieldCheck,
    accentColor: "#4ADE80",
    badgeLabel: "Endotoxin & BAC Safety",
    title: "Safety Calculator",
    description: "Calculate endotoxin limits and BAC water safety for your reconstituted peptides.",
    ctaLabel: "Open Safety Calculator",
    ctaBg: "linear-gradient(135deg, #16A34A, #15803D)",
    bg: "linear-gradient(180deg, #0A1F2E 0%, #0D2B20 100%)",
    border: "rgba(74,222,128,0.12)",
  },
  {
    id: "vial",
    icon: FlaskConical,
    accentColor: "#A78BFA",
    badgeLabel: "Single Vials",
    title: "The Lonely Vial",
    description: "Buy individual vials — no kits, no minimums. Pay with USDT.",
    ctaLabel: "Browse the Shop",
    ctaBg: "linear-gradient(135deg, #7C3AED, #6D28D9)",
    bg: "linear-gradient(180deg, #120A2E 0%, #1D0D45 100%)",
    border: "rgba(139,92,246,0.2)",
  },
];

function CollapsibleCard({ card, isOpen, onToggle }: { card: Card; isOpen: boolean; onToggle: () => void }) {
  const { icon: Icon } = card;
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: card.bg,
        border: `1px solid ${card.border}`,
        transition: "all 0.2s ease",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        aria-expanded={isOpen}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${card.accentColor}18` }}
        >
          <Icon style={{ color: card.accentColor, width: "18px", height: "18px" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: card.accentColor }}>
            {card.badgeLabel}
          </p>
          <p className="text-sm font-bold text-white leading-none">{card.title}</p>
        </div>
        <ChevronDown
          className="w-4 h-4 text-white/40 shrink-0"
          style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          <div className="h-px mb-3" style={{ background: "rgba(255,255,255,0.07)" }} />
          <p className="text-sm text-white/65 leading-relaxed mb-4">{card.description}</p>
          <button
            onClick={() => {}}
            className="h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full text-white"
            style={{ background: card.ctaBg }}
          >
            {card.id === "order" && <Users style={{ width: "16px", height: "16px" }} />}
            {card.id !== "order" && <Icon style={{ color: "white", width: "16px", height: "16px" }} />}
            {card.ctaLabel}
            <ArrowRight style={{ width: "16px", height: "16px" }} />
          </button>
        </div>
      )}
    </div>
  );
}

export function CollapsedStack() {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div
      className="w-full flex flex-col pb-14 min-h-screen"
      style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <TopNav />

      <main className="flex-1 px-4 pt-4 pb-4 max-w-md mx-auto w-full flex flex-col gap-2.5">

        <div className="text-center pt-1 pb-2">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Salt &amp; Peps
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Peps Anonymous · Tap a section to expand</p>
        </div>

        {CARDS.map(card => (
          <CollapsibleCard
            key={card.id}
            card={card}
            isOpen={openId === card.id}
            onToggle={() => toggle(card.id)}
          />
        ))}

        <div className="flex items-center justify-between pt-2 px-1">
          <a
            href="https://t.me/urbanblend789"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5"
            style={{ color: "#2AABEE" }}
          >
            <MessageCircle style={{ width: "14px", height: "14px" }} />
            <span className="font-semibold text-xs">@urbanblend789</span>
          </a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>

      </main>

      <BottomTabs />
    </div>
  );
}
