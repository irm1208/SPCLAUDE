export type Part =
  | { text: string; inlineData?: never }
  | { inlineData: { mimeType: string; data: string }; text?: never }
  | Record<string, unknown>;

export type Content = {
  role: string;
  parts: Part[];
};

export type GenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  thinkingConfig?: { thinkingBudget: number };
  responseMimeType?: string;
  systemInstruction?: string;
  tools?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export interface GenerateContentParams {
  model: string;
  contents: Content[];
  config?: GenerationConfig;
}

export interface Candidate {
  content: { parts: Array<{ text?: string }>; role: string };
  finishReason?: string;
  groundingMetadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GenerateContentResponse {
  text?: string;
  candidates?: Candidate[];
  [key: string]: unknown;
}

export declare class GoogleGenAI {
  models: {
    generateContent(params: GenerateContentParams): Promise<GenerateContentResponse>;
  };
  constructor(options: {
    apiKey?: string;
    httpOptions?: {
      apiVersion?: string;
      baseUrl?: string;
    };
  });
}
