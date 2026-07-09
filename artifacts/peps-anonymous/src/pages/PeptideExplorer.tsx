import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PeptideExplorer() {
  const [, setLocation] = useLocation();
  const src = `${import.meta.env.BASE_URL}peptide-explorer/index.html`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#05060a" }}>
      <button
        onClick={() => setLocation("/learn")}
        aria-label="Back to Learning Hub"
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 999,
          background: "rgba(10,13,22,0.72)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: "blur(8px)",
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={15} />
        Learning Hub
      </button>
      <iframe
        title="3D Peptide Explorer"
        src={src}
        allow="fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
