import { z } from "zod";

export const createFolderSchema = z.object({
    name: z.string().min(1).max(255),
    parentId :  z.string().uuid().nullable().optional(),
});

export const updateFolderSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    parentId :  z.string().uuid().nullable().optional(),
});


export type CreateFolderInput  = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput  = z.infer<typeof updateFolderSchema>;