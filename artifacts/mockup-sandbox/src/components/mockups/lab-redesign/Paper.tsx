// OPPOSITE OF: dark-mode, screen-native, digital editorial.
// This variant treats the report as a physical, mailed Certificate of
// Authenticity: paper texture, serif headlines, a wet-ink signature,
// an embossed seal, perforation edge, a postmark stamp, and a serial
// number you could write on with a pen. It argues the opposite
// assumption: maybe trust is best conveyed by tangible document
// conventions, not screen design.

export function Paper() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        background:
          "repeating-linear-gradient(45deg, #2A2520 0 2px, #231F1A 2px 4px)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Paper */}
      <div
        className="relative"
        style={{
          width: 540,
          padding: "44px 48px 56px",
          background:
            "radial-gradient(circle at 30% 10%, #FAF7F0 0%, #F2EDDF 55%, #E8E0CC 100%)",
          color: "#2B2116",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.3)",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.14  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\"), radial-gradient(circle at 30% 10%, #FAF7F0 0%, #F2EDDF 55%, #E8E0CC 100%)",
        }}
      >
        {/* Perforation left edge */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: 0,
            width: 14,
            background:
              "radial-gradient(circle at 7px 8px, transparent 3px, #F2EDDF 3.5px) 0 0 / 14px 16px",
          }}
        />

        {/* Watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: 0.05 }}
        >
          <span
            style={{
              fontSize: 180,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              transform: "rotate(-22deg)",
            }}
          >
            S &amp; P
          </span>
        </div>

        {/* Header */}
        <header className="relative text-center">
          <div
            className="inline-flex items-center gap-3 text-[10px] tracking-[0.4em] uppercase"
            style={{ color: "#8A6A3D" }}
          >
            <span
              className="h-[1px] w-10"
              style={{ background: "#8A6A3D" }}
            />
            Salt &amp; Peps Laboratory
            <span
              className="h-[1px] w-10"
              style={{ background: "#8A6A3D" }}
            />
          </div>
          <h1
            className="mt-4 font-bold leading-[0.95]"
            style={{
              fontSize: 36,
              letterSpacing: "-0.01em",
              fontVariant: "small-caps",
            }}
          >
            Certificate of Analysis
          </h1>
          <div
            className="mt-2 text-[11px] italic"
            style={{ color: "#6E5939" }}
          >
            issued by independent assay · valid with seal
          </div>
          <div
            className="mt-5 mx-auto"
            style={{
              width: 140,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, #8A6A3D, transparent)",
            }}
          />
        </header>

        {/* Body: "This is to certify" paragraph */}
        <section className="relative mt-7 text-[13px] leading-[1.75] text-center">
          <p>This is to certify that the vial bearing serial</p>
          <div
            className="mt-2 mx-auto inline-block px-4 py-1 font-mono text-[14px] tracking-[0.15em]"
            style={{
              border: "1.5px solid #3B2A14",
              background: "rgba(255,255,255,0.35)",
            }}
          >
            ZE30-0319
          </div>
          <p className="mt-3">
            has been independently assayed and found to contain
          </p>
          <p
            className="mt-3 font-bold"
            style={{
              fontSize: 24,
              fontVariant: "small-caps",
              letterSpacing: "0.02em",
            }}
          >
            Tirzepatide · 10 milligrams
          </p>
          <p className="mt-3">
            at a chromatographic purity of
          </p>
          <p
            className="mt-1 font-bold"
            style={{ fontSize: 32, letterSpacing: "-0.01em" }}
          >
            ninety-nine &amp;{" "}
            <sup style={{ fontSize: 16 }}>89⁄100</sup> per cent
          </p>
        </section>

        {/* Particulars table */}
        <section
          className="relative mt-8 text-[11px]"
          style={{ color: "#3B2A14" }}
        >
          <Row label="Supplier of record" value="Uther" />
          <Row label="Analyte verified" value="Tirzepatide (MS match, Δ 0.33 ppm)" />
          <Row label="Mass per vial" value="10.1 mg (target 10.0 mg)" />
          <Row label="Method" value="HPLC-UV · 214 nm · C18 column" />
          <Row label="Assayed by" value="Janoshik Analytical, third-party" />
          <Row label="Date of assay" value="the tenth day of April, 2026" />
        </section>

        {/* Signature + seal */}
        <section className="relative mt-8 flex items-end justify-between">
          <div>
            <div
              style={{
                fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                fontSize: 30,
                color: "#1F3A6B",
                lineHeight: 1,
                transform: "rotate(-3deg)",
              }}
            >
              M. Janošík
            </div>
            <div
              className="mt-1 text-[10px] italic"
              style={{ color: "#6E5939", borderTop: "1px solid #8A6A3D", paddingTop: 4, width: 170 }}
            >
              Signed, Chief Analyst
            </div>
          </div>

          {/* Wax / embossed seal */}
          <div className="relative" style={{ width: 110, height: 110 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #C2341F, #8B1C0C 60%, #5C1006 100%)",
                boxShadow:
                  "inset 0 4px 8px rgba(255,255,255,0.2), inset 0 -6px 10px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.4)",
              }}
            />
            <div
              className="absolute inset-2 rounded-full flex items-center justify-center text-center"
              style={{
                border: "1px dashed rgba(255,255,255,0.4)",
                color: "#FBE9C6",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "'Georgia', serif",
                lineHeight: 1.2,
              }}
            >
              Salt &amp; Peps
              <br />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  display: "block",
                  margin: "4px 0",
                }}
              >
                VERIFIED
              </span>
              Apr · 2026
            </div>
          </div>
        </section>

        {/* Postmark stamp */}
        <div
          className="absolute"
          style={{
            right: 30,
            top: 30,
            transform: "rotate(-14deg)",
            border: "2px solid #3C6B3A",
            color: "#3C6B3A",
            padding: "8px 12px",
            fontFamily: "'Courier New', monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            lineHeight: 1.2,
            textAlign: "center",
            opacity: 0.75,
          }}
        >
          ✦ POSTED ✦
          <br />
          10 · APR · 2026
          <br />
          BRNO · CZ
        </div>

        {/* Footer micro-type */}
        <footer
          className="relative mt-8 text-center text-[9px] tracking-[0.25em] uppercase"
          style={{ color: "#8A6A3D" }}
        >
          Certificate no. 0319 — of 2026 — salt &amp; peps
        </footer>

        {/* Bottom edge shadow / torn look */}
        <div
          className="absolute left-0 right-0 bottom-0 h-2"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(0,0,0,0.12))",
          }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="grid py-1"
      style={{
        gridTemplateColumns: "160px 1fr",
        gap: 12,
        borderBottom: "1px dotted #8A6A3D",
      }}
    >
      <span className="italic" style={{ color: "#6E5939" }}>
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
