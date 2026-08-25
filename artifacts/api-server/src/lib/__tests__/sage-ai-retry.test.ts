import { afterEach, describe, expect, it, vi } from "vitest";
import { callSageAI } from "../sage-ai";

describe("Sage AI endpoint fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries with the configured fallback when the primary token is rejected", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "Invalid token" },
      }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: "[]" }, finish_reason: "stop" }],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callSageAI({
      system: "Return JSON.",
      messages: [{ role: "user", content: "Example shipment" }],
      model: "test-model",
      apiKey: "primary-token",
      enableWebSearch: false,
    })).resolves.toBe("[]");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});