import { z } from "zod";

export const initiateSessionSchema = z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(100).default("application/octet-stream"),
    expectedSizeBytes: z.number().int().positive(),
    expectedSha256: z.string().length(64),
    parentId: z.string().uuid().nullable().optional(),
    fileId: z.string().uuid().nullable().optional(),
});

export const sessionParamSchema = z.object({
    id: z.string().uuid(),
});

export const partParamSchema = z.object({
    id: z.string().uuid(),
    partNumber: z.coerce.number().int().min(1),
});

export type InitiateSessionInput = z.infer<typeof initiateSessionSchema>;
