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

  it("retries with the configured fallback when the primary endpoint times out", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new DOMException("The operation was aborted due to timeout", "TimeoutError"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: "Recovered through CN" }, finish_reason: "stop" }],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callSageAI({
      messages: [{ role: "user", content: "Hello Sage" }],
      model: "test-model",
      apiKey: "primary-token",
      enableWebSearch: false,
    })).resolves.toBe("Recovered through CN");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("cn.zhihuiai.top");
  });

  it("sends lab-report images as OpenAI image_url content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "{}" }, finish_reason: "stop" }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callSageAI({
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: "aW1hZ2U=" } },
          { type: "text", text: "Extract the lab results." },
        ],
      }],
      model: "gpt-5.5",
      apiKey: "test-token",
      enableWebSearch: false,
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.messages[0].content).toEqual([
      { type: "image_url", image_url: { url: "data:image/png;base64,aW1hZ2U=" } },
      { type: "text", text: "Extract the lab results." },
    ]);
  });
});