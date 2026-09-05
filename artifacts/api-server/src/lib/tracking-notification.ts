import type { TrackingPackage } from "@workspace/shipping/tracking";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatTrackingNumbersForNotification(packages: TrackingPackage[]): string {
  return packages.flatMap((pkg, index) => {
    const prefix = packages.length > 1 ? `Package ${index + 1} · ` : "";
    const lines = [
      `${prefix}International (${escapeHtml(pkg.courier)}): <code>${escapeHtml(pkg.internationalTrackingNumber)}</code>`,
    ];
    if (pkg.localTrackingNumber) {
      lines.push(`${prefix}Local courier: <code>${escapeHtml(pkg.localTrackingNumber)}</code>`);
    }
    return lines;
  }).join("\n");
}