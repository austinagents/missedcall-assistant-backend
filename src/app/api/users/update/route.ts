import { databaseFailure, failure, parseJsonBody, success } from "@/lib/api";
import { env } from "@/lib/env";
import { toUserUpdate } from "@/lib/mappers";
import { userUpdateSchema } from "@/lib/schemas";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, userUpdateSchema);

  if (!body.success) {
    return body.response;
  }

  const { id, ...updates } = body.data;

  const { data: existingUser, error: existingUserError } = await supabaseService
    .from("users")
    .select("assistant_number")
    .eq("id", id)
    .maybeSingle();

  if (existingUserError) {
    return databaseFailure(existingUserError.message);
  }

  if (!existingUser) {
    return failure("User not found", 404);
  }

  const { data, error } = await supabaseService
    .from("users")
    .update({
      ...toUserUpdate(updates),
      assistant_number: existingUser.assistant_number ?? env.TWILIO_PHONE_NUMBER,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return databaseFailure(error.message);
  }

  if (!data) {
    return failure("User not found", 404);
  }

  return success(data);
}
