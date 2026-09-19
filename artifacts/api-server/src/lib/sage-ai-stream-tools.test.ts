import { afterEach, describe, expect, it, vi } from "vitest";
import { callSageAIStreamWithTools } from "./sage-ai";

describe("callSageAIStreamWithTools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delivers the completed grounded tool-loop answer without generating a second answer", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{
          finish_reason: "stop",
          message: {
            content: "Your testosterone is 49.7 nmol/L, above the supplied reference range.",
            tool_calls: [],
          },
        }],
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response([
        'data: {"choices":[{"delta":{"content":"Please upload your results."}}]}',
        "data: [DONE]",
        "",
      ].join("\n"), { status: 200, headers: { "content-type": "text/event-stream" } }));
    vi.stubGlobal("fetch", fetchMock);
    const onToken = vi.fn();

    const result = await callSageAIStreamWithTools({
      system: "The user's biomarkers are present.",
      messages: [{ role: "user", content: "Analyse my latest bloodwork." }],
      model: "gpt-5.5",
      apiKey: "test-key",
      baseUrl: "https://sage.test",
      onToken,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toBe("Your testosterone is 49.7 nmol/L, above the supplied reference range.");
    expect(onToken).toHaveBeenCalledOnce();
    expect(onToken).toHaveBeenCalledWith(result);
  });
});