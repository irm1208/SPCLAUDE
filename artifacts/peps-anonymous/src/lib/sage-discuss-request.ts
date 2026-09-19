export type SageDiscussHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SageDiscussRequestBody = {
  message: string;
  sessionId?: string;
  history?: SageDiscussHistoryMessage[];
};

export function buildSageDiscussRequestBody({
  message,
  sessionId,
  history,
}: SageDiscussRequestBody): SageDiscussRequestBody {
  return { message, sessionId, history };
}