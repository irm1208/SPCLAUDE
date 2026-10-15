import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { storePageUpdateImage, storeWholesaleUpdateImage, type UpdateImageStore } from "./wholesale-update-images";

const store = (): UpdateImageStore => ({
  uploadFromBytes: vi.fn().mockResolvedValue({ ok: true }),
  downloadAsBytes: vi.fn(), delete: vi.fn(),
} as unknown as UpdateImageStore);

describe("wholesale update image uploads", () => {
  it("stores actual images as resized WebP in App Storage", async () => {
    const client = store();
    const buffer = await sharp({ create: { width: 1800, height: 2, channels: 3, background: "blue" } }).png().toBuffer();
    const key = await storeWholesaleUpdateImage(buffer, client);
    expect(key).toMatch(/^wholesale-updates\/[a-f0-9-]+\.webp$/);
    const bytes = vi.mocked(client.uploadFromBytes).mock.calls[0][1];
    const metadata = await sharp(Buffer.from(bytes)).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(1600);
  });
  it("rejects SVG, arbitrary content and oversized uploads", async () => {
    const client = store();
    await expect(storeWholesaleUpdateImage(Buffer.from("<svg></svg>"), client)).rejects.toThrow(/image/i);
    await expect(storeWholesaleUpdateImage(Buffer.alloc(5 * 1024 * 1024 + 1), client)).rejects.toThrow(/5 MB/);
    expect(client.uploadFromBytes).not.toHaveBeenCalled();
  });
  it("fails explicitly when storage rejects the upload", async () => {
    const client = store();
    vi.mocked(client.uploadFromBytes).mockResolvedValue({ ok: false, error: { message: "bucket unavailable" } } as never);
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).png().toBuffer();
    await expect(storeWholesaleUpdateImage(buffer, client)).rejects.toThrow(/store/i);
  });
  it("stores group-buy images in their own namespace", async () => {
    const client = store();
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).png().toBuffer();
    expect(await storePageUpdateImage(buffer, "group-buy-updates", client)).toMatch(/^group-buy-updates\/[a-f0-9-]+\.webp$/);
  });
});
