import { z } from "zod";

import {
  processVoicemail,
  VoicemailNotFoundError,
} from "@/lib/voicemail-processing";

export const dynamic = "force-dynamic";

const processRequestSchema = z.object({
  voicemailId: z.uuid(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return failure("Invalid JSON body", 400);
  }

  const parsed = processRequestSchema.safeParse(body);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  try {
    const voicemail = await processVoicemail(parsed.data.voicemailId);

    return Response.json({
      success: true,
      voicemail,
    });
  } catch (error) {
    if (error instanceof VoicemailNotFoundError) {
      return failure(error.message, 404);
    }

    const message =
      error instanceof Error ? error.message : "Voicemail processing failed";

    return failure(message, 500);
  }
}

function failure(error: string, status: number): Response {
  return Response.json({ success: false, error }, { status });
}
