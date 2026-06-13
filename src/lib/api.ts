import { z } from "zod";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: string;
};

export function success<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, init);
}

export function failure(error: string, status = 400): Response {
  return Response.json(
    { success: false, error } satisfies ApiFailure,
    { status },
  );
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { success: false, response: failure("Invalid JSON body", 400) };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      success: false,
      response: failure(parsed.error.issues[0]?.message ?? "Invalid request", 400),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseSearchParams<T>(
  request: Request,
  schema: z.ZodType<T>,
): { success: true; data: T } | { success: false; response: Response } {
  const url = new URL(request.url);
  const values = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      response: failure(parsed.error.issues[0]?.message ?? "Invalid request", 400),
    };
  }

  return { success: true, data: parsed.data };
}

export function databaseFailure(message: string): Response {
  return failure(message, 500);
}
