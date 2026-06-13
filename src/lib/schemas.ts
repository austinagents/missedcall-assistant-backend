import { z } from "zod";

export const uuidSchema = z.uuid();

const optionalTextSchema = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional();

export const userCreateSchema = z.object({
  id: uuidSchema.optional(),
  authProvider: optionalTextSchema,
  email: z.email().nullable().optional(),
  phoneNumber: optionalTextSchema,
  carrier: optionalTextSchema,
  forwardingNumber: optionalTextSchema,
  forwardingEnabled: z.boolean().optional(),
  greetingStatus: optionalTextSchema,
  pushNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

export const userGetQuerySchema = z.object({
  id: uuidSchema,
});

export const userUpdateSchema = z.object({
  id: uuidSchema,
  phoneNumber: optionalTextSchema,
  carrier: optionalTextSchema,
  forwardingNumber: optionalTextSchema,
  forwardingEnabled: z.boolean().optional(),
  greetingStatus: optionalTextSchema,
  pushNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

export const voicemailListQuerySchema = z.object({
  userId: uuidSchema,
});

export const voicemailCreateSchema = z.object({
  userId: uuidSchema,
  callerNumber: optionalTextSchema,
  recordingUrl: z.url().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  transcript: optionalTextSchema,
  emailSent: z.boolean().optional(),
  pushSent: z.boolean().optional(),
});

export const activityListQuerySchema = z.object({
  userId: uuidSchema,
});
