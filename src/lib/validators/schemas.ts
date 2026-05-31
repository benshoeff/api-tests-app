import { z } from "zod";

export const environmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1).optional(),
  baseUrl: z.string().optional().nullable(),
  color: z.string().default("blue"),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const environmentUpdateSchema = environmentSchema.partial();

export const variableSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid key format"),
  description: z.string().optional().nullable(),
  isSecret: z.boolean().optional(),
  values: z.array(z.object({ environmentId: z.string(), value: z.string() })).optional(),
});

export const variableUpdateSchema = variableSchema.partial();

export const stepSchema = z.object({
  type: z.enum(["http", "assert", "delay", "shared_ref"]),
  config: z.record(z.unknown()),
  sortOrder: z.number().int().optional(),
});

export const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  timeoutMs: z.number().int().min(1000).max(600000).optional(),
  environmentIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  steps: z.array(stepSchema).optional(),
});

export const testUpdateSchema = testSchema.partial();

export const sharedStepSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  items: z.array(stepSchema).optional(),
});

export const sharedStepUpdateSchema = sharedStepSchema.partial();

export const runTestSchema = z.object({
  environmentId: z.string().min(1, "Environment is required"),
});
