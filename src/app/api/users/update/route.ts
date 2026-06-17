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
  const targetUserId = env.TEST_USER_ID ?? id;

  const { data, error } = await supabaseService
    .from("users")
    .update(toUserUpdate(updates))
    .eq("id", targetUserId)
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
