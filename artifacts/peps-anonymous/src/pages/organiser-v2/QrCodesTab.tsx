import { GbQrCodesPanel } from "@/components/GbQrCodesPanel";
import { V2_CARD_BORDER } from "./theme";
import { QrCode } from "lucide-react";

// ─── Workspace: QR Codes Tab ─────────────────────────────────────────────────
// View and manage QR codes for orders (InPost, Royal Mail, custom delivery QRs)

interface QrCodesTabProps {
  selectedGbId?: string;
}

export default function QrCodesTab({ selectedGbId }: QrCodesTabProps = {}) {
  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <QrCode className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to view QR codes for orders
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>
          QR Codes
        </h2>
        <p className="text-[12px] sm:text-[13px] mt-1" style={{ color: "var(--t-subtle)" }}>
          View delivery QR codes for InPost, Royal Mail, and custom shipping options
        </p>
      </div>

      {/* Wrapped GbQrCodesPanel with custom styling */}
      <div className="qr-codes-panel-wrapper">
        <style>{`
          .qr-codes-panel-wrapper {
            /* Override default styles to match organiser-v2 design */
          }

          .qr-codes-panel-wrapper .rounded-xl {
            border: 1px solid ${V2_CARD_BORDER};
          }

          .qr-codes-panel-wrapper button {
            transition: all 0.2s ease;
          }

          .qr-codes-panel-wrapper input,
          .qr-codes-panel-wrapper select {
            border-color: ${V2_CARD_BORDER};
            outline: none;
          }

          .qr-codes-panel-wrapper input:focus,
          .qr-codes-panel-wrapper select:focus {
            border-color: var(--t-blue);
            box-shadow: 0 0 0 3px var(--t-blue-10);
          }

          /* Ensure cards match organiser-v2 style */
          .qr-codes-panel-wrapper > div {
            background: white;
            border-radius: 12px;
            border: 1px solid ${V2_CARD_BORDER};
          }
        `}</style>

        <GbQrCodesPanel gbId={selectedGbId} mode="organiser" />
      </div>
    </div>
  );
}
