import { z } from "zod";

export const shareResourceSchema = z.object({
    resourceType: z.enum(["file", "folder"]),
    resourceId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(["viewer", "editor"]),
});

export const resourceParamSchema = z.object({
    resourceType: z.enum(["file", "folder"]),
    resourceId: z.string().uuid(),
});

export const permissionIdParamSchema = z.object({
    id: z.string().uuid(),
});

export type ShareResourceInput = z.infer<typeof shareResourceSchema>;