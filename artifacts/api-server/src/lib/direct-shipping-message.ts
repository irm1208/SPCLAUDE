import { z } from "zod/v4";
export const directShippingMessageSchema = z.string().trim().max(500).nullable().transform(value => value || null);
