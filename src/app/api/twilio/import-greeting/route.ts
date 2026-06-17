import { z } from "zod";

import { failure, parseJsonBody, success } from "@/lib/api";
import { env } from "@/lib/env";
import { normalizeUsPhoneNumber } from "@/lib/phone";
import { supabaseService } from "@/lib/supabase";
import { createGreetingImportCall } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const importGreetingSchema = z.object({
  userId: z.uuid(),
  phoneNumber: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, importGreetingSchema);

  if (!body.success) {
    return body.response;
  }

  const targetUserId = env.TEST_USER_ID ?? body.data.userId;

  const { data: user, error: userError } = await supabaseService
    .from("users")
    .select()
    .eq("id", targetUserId)
    .maybeSingle();

  if (userError) {
    return failure(userError.message, 500);
  }

  if (!user) {
    return failure("User not found", 404);
  }

  const normalizedPhoneNumber = normalizeUsPhoneNumber(body.data.phoneNumber);

  const { error: updateError } = await supabaseService
    .from("users")
    .update({
      phone_number: normalizedPhoneNumber,
      assistant_number: user.assistant_number ?? env.TWILIO_PHONE_NUMBER,
    })
    .eq("id", user.id);

  if (updateError) {
    return failure(updateError.message, 500);
  }

  let callSid: string;

  try {
    callSid = await createGreetingImportCall(user.id, normalizedPhoneNumber);
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Twilio greeting import call failed",
      },
      { status: 500 },
    );
  }

  return success({
    callSid,
    to: normalizedPhoneNumber,
    userId: user.id,
  });
}
