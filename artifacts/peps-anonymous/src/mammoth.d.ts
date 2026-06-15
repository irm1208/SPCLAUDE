declare module "mammoth" {
  interface Result {
    value: string;
    messages: unknown[];
  }
  interface Options {
    arrayBuffer: ArrayBuffer;
  }
  export function extractRawText(options: Options): Promise<Result>;
}
