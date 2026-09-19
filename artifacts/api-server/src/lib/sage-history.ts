export type SageHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

const NO_DATA_LANGUAGE_RE =
  /\b(?:can(?:not|['’]t)|do(?: not|n['’]t)|did(?: not|n['’]t)|does(?: not|n['’]t))\s+(?:see|have|find)|\b(?:not|isn't|isn’t|is not)\s+(?:visible|available|on file)|\bno\s+blood(?:work|[\s-]?test)\s+(?:results?|on file)|\breport\s+(?:isn't|isn’t|is not|wasn't|wasn’t|was not)\s+visible/i;
const REQUEST_RESULTS_RE =
  /\b(?:upload(?:ed)?|attach(?:ed)?|paste|send|share)\b/i;
const DIRECT_CURRENT_RESULTS_REQUEST_RE =
  /\b(?:please\s+)?(?:upload|attach|paste|send|share)\s+(?:the\s+|your\s+|those\s+|these\s+)?(?:report|results?|bloodwork|blood[\s-]?test)\b/i;

/**
 * Detects a model response that contradicts blood-test context already loaded
 * by the server.
 */
export function isBloodDataUnavailableResponse(content: string): boolean {
  return (
    DIRECT_CURRENT_RESULTS_REQUEST_RE.test(content) ||
    (
      NO_DATA_LANGUAGE_RE.test(content) &&
      REQUEST_RESULTS_RE.test(content)
    )
  );
}

/**
 * Removes obsolete assistant turns that claim the member has no report when
 * the current request has already loaded real biomarker data.
 */
export function removeStaleNoDataAssistantMessages(
  history: SageHistoryMessage[],
): SageHistoryMessage[] {
  return history.filter((message) => {
    if (message.role !== "assistant") return true;
    return !isBloodDataUnavailableResponse(message.content);
  });
}