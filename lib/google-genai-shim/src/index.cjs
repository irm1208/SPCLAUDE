function convertPart(part) {
  if (part.text !== undefined) {
    return { type: "text", text: part.text };
  }
  if (part.inlineData) {
    return {
      type: "image_url",
      image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
    };
  }
  if (part.fileData) {
    return { type: "image_url", image_url: { url: part.fileData.fileUri } };
  }
  return { type: "text", text: "" };
}

function convertContents(contents, systemInstruction) {
  const messages = [];
  if (systemInstruction) {
    const sysText = Array.isArray(systemInstruction.parts)
      ? systemInstruction.parts.map((p) => p.text ?? "").join("\n")
      : String(systemInstruction);
    messages.push({ role: "system", content: sysText });
  }
  for (const c of contents) {
    const parts = (c.parts ?? []).map(convertPart);
    const content =
      parts.length === 1 && parts[0].type === "text"
        ? parts[0].text
        : parts;
    messages.push({ role: c.role ?? "user", content });
  }
  return messages;
}

class Models {
  constructor(apiKey, baseUrl) {
    this._apiKey = apiKey;
    this._baseUrl = baseUrl.replace(/\/$/, "");
  }

  async generateContent({ model, contents, config }) {
    const messages = convertContents(
      contents,
      config?.systemInstruction ?? null
    );

    const body = { model, messages };

    if (config) {
      if (config.temperature !== undefined) body.temperature = config.temperature;
      if (config.maxOutputTokens !== undefined) body.max_tokens = config.maxOutputTokens;
      if (config.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
      }
    }

    const res = await fetch(`${this._baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this._apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return { ...data, text };
  }
}

class GoogleGenAI {
  constructor(options) {
    const apiKey = options?.apiKey ?? "";
    const baseUrl =
      options?.httpOptions?.baseUrl ??
      "https://generativelanguage.googleapis.com";
    this.models = new Models(apiKey, baseUrl);
  }
}

module.exports = { GoogleGenAI };
