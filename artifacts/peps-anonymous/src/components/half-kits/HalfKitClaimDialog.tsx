import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import "./half-kit-claim-dialog.css";

export function HalfKitClaimDialog({ children, footer, pending, onClose }: {
  children: ReactNode;
  footer: ReactNode;
  pending: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !pending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="half-kit-claim-overlay" />
        <Dialog.Content className="half-kit-claim-dialog">
          <header className="half-kit-claim-header">
            <div>
              <Dialog.Title className="text-lg font-bold">Confirm half kit</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs" style={{ color: "var(--t-muted)" }}>
                Check the order and additional amount before confirming.
              </Dialog.Description>
            </div>
            <Dialog.Close disabled={pending} aria-label="Close half-kit confirmation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border disabled:opacity-50"
              style={{ borderColor: "var(--t-border)" }}>
              <X className="h-5 w-5" />
            </Dialog.Close>
          </header>
          <div className="half-kit-claim-body">{children}</div>
          <footer className="half-kit-claim-footer">{footer}</footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
