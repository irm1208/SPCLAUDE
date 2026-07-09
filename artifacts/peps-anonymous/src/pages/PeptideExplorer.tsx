import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PeptideExplorer() {
  const [, setLocation] = useLocation();
  const src = `${import.meta.env.BASE_URL}peptide-explorer/index.html`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#05060a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          background: "#0b0e17",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => setLocation("/learn")}
          aria-label="Back to Learning Hub"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={15} />
          Learning Hub
        </button>
      </div>
      <div style={{ flex: "1 1 auto", minHeight: 0 }}>
        <iframe
          title="3D Peptide Explorer"
          src={src}
          allow="fullscreen"
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
      </div>
    </div>
  );
}
