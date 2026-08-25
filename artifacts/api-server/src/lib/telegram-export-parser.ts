const TELEGRAM_MESSAGE_START =
  /^\s*(\[\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\])\s*-\s*/gm;

/**
 * Adds explicit boundaries to Telegram exports before they are sent to the
 * model. Telegram's timestamp line is metadata, not part of the shipment
 * content, but keeping it in each label preserves chronology for correlation.
 */
export function formatTelegramExportForAi(rawText: string): string {
  const markers = [...rawText.matchAll(TELEGRAM_MESSAGE_START)];
  if (markers.length === 0) return rawText;

  const blocks = markers.map((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? rawText.length;
    return `Telegram message ${index + 1} ${marker[1]}\n${rawText.slice(start, end).trim()}`;
  });

  const preamble = rawText.slice(0, markers[0].index ?? 0).trim();
  return [
    "TELEGRAM EXPORT — Every timestamped block is one Telegram message.",
    "A tracking number may be at the beginning or end of any message.",
    "Correlate consecutive messages that belong to the same shipment and keep every tracking number.",
    preamble,
    ...blocks,
  ].filter(Boolean).join("\n\n");
}