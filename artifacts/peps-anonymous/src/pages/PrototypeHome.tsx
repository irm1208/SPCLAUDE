import { useState } from "react";
import { useLocation } from "wouter";

// ─── Design tokens (extracted from cosmos.so source HTML) ─────────────────────
const T = {
  pageBg:      "#FFFFFF",
  textPrimary: "#0D0D0D",
  textMuted:   "#6B6B6B",
  // Nav
  navBorder:   "rgba(0,0,0,0.12)",
  navPillBg:   "#FFFFFF",
  // Buttons
  signUpBg:    "#0D0D0D",
  // Cards — hues from cosmos source data
  card1Bg:     "#697c79",   // gray-green (screenshot card 1)
  card2Bg:     "#2757D0",   // blue (screenshot card 2)
  card3Bg:     "#18111F",   // deep dark (screenshot card 3)
  // Captions — cosmos uses font-cosmos-oracle, 24px, tracking -0.96px, leading 0.8
  captionSize: "24px",
  captionTracking: "-0.96px",
  captionLeading:  "0.8",
};

const NAV_LINKS = [
  { label: "Protocols",    href: "/prototypeprotocols"   },
  { label: "Supplements",  href: "/prototypesupplements" },
  { label: "Learning Hub", href: "/prototypelearn"       },
  { label: "Calculators",  href: "/prototypecalculator"  },
];

export default function PrototypeHome() {
  const [, setLocation] = useLocation();
  const [activeNav, setActiveNav] = useState("Protocols");
  const [hovLogin, setHovLogin]   = useState(false);
  const [hovSignup, setHovSignup] = useState(false);

  const go = (href: string, label?: string) => {
    if (label) setActiveNav(label);
    setLocation(href);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: T.pageBg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: T.textPrimary,
    }}>

      {/* ── Navigation — matches cosmos exactly: logo circle · shared pill · spacer · login · signup ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.90)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex", alignItems: "center",
        padding: "0 20px", height: "72px", gap: "8px",
      }}>

        {/* Logo — cosmos-style: circle border, icon inside */}
        <a
          onClick={e => { e.preventDefault(); go("/prototypehome"); }}
          href="/prototypehome"
          style={{
            width: 44, height: 44, borderRadius: "50%",
            border: `1px solid ${T.navBorder}`,
            background: T.navPillBg,
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", marginRight: "4px", textDecoration: "none",
          }}
        >
          {/* S&P logo mark — navy rounded square inside the circle */}
          <div style={{
            width: 28, height: 28, borderRadius: "6px",
            background: "#1B3A7A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 180 180" fill="none">
              <text x="90" y="126"
                textAnchor="middle"
                fontFamily="'DM Serif Display', Georgia, serif"
                fontSize="82" fontWeight="400" letterSpacing="-2"
                fill="white">S&amp;P</text>
            </svg>
          </div>
        </a>

        {/* Single shared pill — nav links — exactly as cosmos does it */}
        <div style={{
          display: "flex", alignItems: "center",
          height: "44px",
          border: `1px solid ${T.navBorder}`,
          borderRadius: "9999px",
          background: T.navPillBg,
          padding: "0 28px",
          gap: "24px",
        }}>
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={e => { e.preventDefault(); go(link.href, link.label); }}
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: activeNav === link.label ? T.textPrimary : T.textMuted,
                textDecoration: "none",
                transition: "color .15s",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = T.textPrimary)}
              onMouseLeave={e => (e.currentTarget.style.color = activeNav === link.label ? T.textPrimary : T.textMuted)}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Login — cosmos: text button, medium, no border */}
        <a
          href="/login"
          onClick={e => { e.preventDefault(); go("/login"); }}
          onMouseEnter={() => setHovLogin(true)}
          onMouseLeave={() => setHovLogin(false)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            height: "44px", padding: "0 20px",
            fontSize: "14px", fontWeight: 500,
            color: T.textPrimary, textDecoration: "none",
            opacity: hovLogin ? 0.55 : 1,
            transition: "opacity .15s",
            cursor: "pointer",
          }}
        >
          Login
        </a>

        {/* Sign up — cosmos: rounded-full, black bg, h-12, px-6 */}
        <a
          href="/login?mode=signup"
          onClick={e => { e.preventDefault(); go("/login?mode=signup"); }}
          onMouseEnter={() => setHovSignup(true)}
          onMouseLeave={() => setHovSignup(false)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            height: "44px", padding: "0 24px",
            background: hovSignup ? "#222" : T.signUpBg,
            color: "#fff",
            borderRadius: "9999px",
            fontSize: "14px", fontWeight: 500,
            textDecoration: "none",
            transition: "background .15s",
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          Sign up
        </a>
      </header>

      {/* ── Hero tagline — cosmos style: massive, tight tracking, blur on last word ── */}
      <div style={{ textAlign: "center", padding: "80px 24px 56px" }}>
        <h2 style={{
          fontSize: "clamp(40px, 5.6vw, 70px)",
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.035em",
          color: T.textPrimary,
          margin: 0,
        }}>
          Research the way you{" "}
          <span style={{
            display: "inline-block",
            filter: "blur(4px)",
            transition: "filter .4s ease",
            cursor: "default",
          }}
            onMouseEnter={e => (e.currentTarget.style.filter = "blur(0px)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "blur(4px)")}
          >
            think.
          </span>
        </h2>
      </div>

      {/* ── Three cards — cosmos layout: flex row, max-w-[1300px], gap-[30px] ── */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        gap: "20px",
        padding: "0 24px 72px",
        maxWidth: "1300px",
        margin: "0 auto",
      }}>

        {/* ── Card 1: Protocols (gray-green) ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", flex: 1, maxWidth: "400px" }}>
          <div
            onClick={() => go("/prototypeprotocols", "Protocols")}
            style={{
              width: "100%", aspectRatio: "400/450",
              background: T.card1Bg,
              borderRadius: "16px",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              transition: "transform .2s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.012)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* Protocol stack rows */}
            <div style={{ padding: "28px 22px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { name: "BPC-157", dose: "250 mcg", freq: "Twice daily"  },
                { name: "TB-500",  dose: "2.5 mg",  freq: "Twice weekly" },
                { name: "GHK-Cu",  dose: "1 mg",    freq: "Daily"        },
                { name: "Ipamorelin", dose: "200 mcg", freq: "3× daily"  },
              ].map((p, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "12px",
                  padding: "13px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>{p.freq}</div>
                  </div>
                  <div style={{
                    fontSize: "12px", fontWeight: 600, color: "#fff",
                    background: "rgba(255,255,255,0.20)", borderRadius: "6px",
                    padding: "4px 10px",
                  }}>{p.dose}</div>
                </div>
              ))}

              {/* Swatch row — mirrors cosmos color chip */}
              <div style={{
                marginTop: "4px",
                background: "rgba(255,255,255,0.14)",
                borderRadius: "12px",
                padding: "12px 16px",
                display: "flex", alignItems: "center", gap: "12px",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "8px",
                  background: "#8FA5A1",
                  border: "2px solid rgba(255,255,255,0.45)",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>#697c79</span>
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>Stack colour</span>
              </div>
            </div>
          </div>

          {/* Caption — cosmos: font-cosmos-oracle 24px leading-[0.8] tracking-[-0.96px] */}
          <p style={{
            fontSize: T.captionSize,
            letterSpacing: T.captionTracking,
            lineHeight: T.captionLeading,
            textAlign: "center",
            color: T.textPrimary,
            margin: 0,
            fontWeight: 400,
          }}>
            By compound and goal.
          </p>
        </div>

        {/* ── Card 2: Learning Hub (blue) ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", flex: 1, maxWidth: "400px" }}>
          <div
            onClick={() => go("/prototypelearn", "Learning Hub")}
            style={{
              width: "100%", aspectRatio: "400/450",
              background: T.card2Bg,
              borderRadius: "16px",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              transition: "transform .2s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.012)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* 2×2 article tile grid */}
            <div style={{
              padding: "22px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: "10px",
              height: "100%",
              boxSizing: "border-box",
            }}>
              {[
                { title: "GLP-1 Mechanisms",        tag: "PEPTIDES",  bg: "rgba(255,255,255,0.14)" },
                { title: "Reconstitution Guide",     tag: "SAFETY",    bg: "rgba(255,255,255,0.22)" },
                { title: "Healing Stack Deep Dive",  tag: "RECOVERY",  bg: "rgba(255,255,255,0.10)" },
                { title: "Blood Marker Basics",      tag: "LABS",      bg: "rgba(255,255,255,0.18)" },
              ].map((a, i) => (
                <div key={i} style={{
                  background: a.bg,
                  borderRadius: "10px",
                  padding: "14px 12px 12px",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end",
                  backdropFilter: "blur(4px)",
                }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)", marginBottom: "5px" }}>{a.tag}</div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>{a.title}</div>
                </div>
              ))}
            </div>
          </div>

          <p style={{
            fontSize: T.captionSize,
            letterSpacing: T.captionTracking,
            lineHeight: T.captionLeading,
            textAlign: "center",
            color: T.textPrimary,
            margin: 0,
            fontWeight: 400,
          }}>
            by mechanism and study.
          </p>
        </div>

        {/* ── Card 3: Calculators (dark) — mirrors cosmos AI-content popup ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", flex: 1, maxWidth: "400px" }}>
          <div
            onClick={() => go("/prototypecalculator", "Calculators")}
            style={{
              width: "100%", aspectRatio: "400/450",
              background: T.card3Bg,
              borderRadius: "16px",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              transition: "transform .2s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.012)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* Subtle dot grid */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }} />
            {/* Ambient purple glow */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse 70% 50% at 50% 85%, rgba(100,60,180,0.30) 0%, transparent 70%)",
            }} />

            {/* White popup — mirrors the "AI content" popup in the screenshot exactly */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              borderRadius: "16px",
              padding: "20px 22px 18px",
              width: "248px",
              boxShadow: "0 32px 72px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.20)",
            }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: T.textPrimary, marginBottom: "5px" }}>
                Precision dosing
              </div>
              <div style={{ fontSize: "12px", color: T.textMuted, marginBottom: "16px", lineHeight: 1.55 }}>
                Enter your vial concentration to get your exact injection volume.
              </div>
              {/* Button row — exact copy of cosmos AI popup: Show · Blur · Hide */}
              <div style={{ display: "flex", gap: "7px" }}>
                <button style={{
                  flex: 1, height: "32px", borderRadius: "9999px",
                  background: "#F2F2F2", border: "none",
                  fontSize: "12px", fontWeight: 500, color: T.textPrimary,
                  cursor: "pointer",
                }}>Reset</button>
                <button style={{
                  flex: 1, height: "32px", borderRadius: "9999px",
                  background: "#F2F2F2", border: "none",
                  fontSize: "12px", fontWeight: 500, color: T.textPrimary,
                  cursor: "pointer",
                }}>Share</button>
                <button style={{
                  flex: 1, height: "32px", borderRadius: "9999px",
                  background: T.signUpBg, border: "none",
                  fontSize: "12px", fontWeight: 600, color: "#fff",
                  cursor: "pointer",
                }}>Calculate</button>
              </div>
            </div>
          </div>

          <p style={{
            fontSize: T.captionSize,
            letterSpacing: T.captionTracking,
            lineHeight: T.captionLeading,
            textAlign: "center",
            color: T.textPrimary,
            margin: 0,
            fontWeight: 400,
          }}>
            and without guesswork.
          </p>
        </div>

      </div>
    </div>
  );
}
