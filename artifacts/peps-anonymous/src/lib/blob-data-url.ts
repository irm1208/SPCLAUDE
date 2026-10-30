/** Read upload bytes without FileReader, which Safari Lockdown Mode may remove. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = typeof blob.arrayBuffer === "function"
    ? await blob.arrayBuffer()
    : await new Response(blob).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(chunks.join(""))}`;
}
