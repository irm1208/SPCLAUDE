type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { fileUri: string; mimeType?: string } };

type GeminiContent = { role?: string; parts: GeminiPart[] };

type GeminiConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  systemInstruction?: { parts: { text?: string }[] } | string;
  thinkingConfig?: { thinkingBudget?: number; [k: string]: unknown };
};

export type GeminiGenerateParams = {
  model: string;
  contents: GeminiContent[];
  config?: GeminiConfig;
};

export type GeminiResponse = { text: string; [k: string]: unknown };

class Models {
  private _apiKey: string;
  private _baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this._apiKey = apiKey;
    this._baseUrl = baseUrl.replace(/\/$/, "");
  }

  async generateContent({ model, contents, config }: GeminiGenerateParams): Promise<GeminiResponse> {
    const body: Record<string, unknown> = { contents };

    if (config) {
      const generationConfig: Record<string, unknown> = {};
      if (config.temperature !== undefined) generationConfig.temperature = config.temperature;
      if (config.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = config.maxOutputTokens;
      if (config.responseMimeType !== undefined) generationConfig.responseMimeType = config.responseMimeType;
      if (config.thinkingConfig !== undefined) generationConfig.thinkingConfig = config.thinkingConfig;
      if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;

      if (config.systemInstruction) {
        const sysText =
          typeof config.systemInstruction === "string"
            ? config.systemInstruction
            : Array.isArray(config.systemInstruction.parts)
              ? config.systemInstruction.parts.map((p) => p.text ?? "").join("\n")
              : String(config.systemInstruction);
        body.systemInstruction = { parts: [{ text: sysText }] };
      }
    }

    const endpoint = `${this._baseUrl}/models/${model}:generateContent`;

    // Google's native generativelanguage endpoint authenticates via the
    // x-goog-api-key header only. Sending an extra "Authorization: Bearer <apiKey>"
    // makes it treat the key as an OAuth2 token and reject the request (401).
    // The Replit AI-integrations proxy, by contrast, needs the Bearer header — so
    // only add it when we are NOT talking to the public Google host.
    const isGoogleNative = /(^|\.)generativelanguage\.googleapis\.com/.test(this._baseUrl);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-goog-api-key": this._apiKey,
    };
    if (!isGoogleNative) {
      headers["Authorization"] = `Bearer ${this._apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const candidates = data.candidates as Array<{
      content: { parts: Array<{ text?: string }> };
    }> | undefined;
    const text = candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { ...data, text };
  }
}

export class GoogleGenAI {
  models: Models;

  constructor(options: {
    apiKey?: string;
    httpOptions?: { baseUrl?: string; apiVersion?: string };
  }) {
    const apiKey =
      options?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_INTEGRATIONS_GEMINI_API_KEY ||
      "";
    const rawBase =
      options?.httpOptions?.baseUrl ??
      "https://generativelanguage.googleapis.com";
    const apiVersion =
      options?.httpOptions?.apiVersion !== undefined
        ? options.httpOptions.apiVersion
        : "v1beta";
    const baseUrl = apiVersion
      ? `${rawBase.replace(/\/$/, "")}/${apiVersion}`
      : rawBase.replace(/\/$/, "");
    this.models = new Models(apiKey, baseUrl);
  }
}
