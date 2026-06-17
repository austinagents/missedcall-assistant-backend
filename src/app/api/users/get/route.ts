import { databaseFailure, failure, parseSearchParams, success } from "@/lib/api";
import { env } from "@/lib/env";
import { userGetQuerySchema } from "@/lib/schemas";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const query = parseSearchParams(request, userGetQuerySchema);

  if (!query.success) {
    return query.response;
  }

  const targetUserId = env.TEST_USER_ID ?? query.data.id;

  const { data, error } = await supabaseService
    .from("users")
    .select()
    .eq("id", targetUserId)
    .maybeSingle();

  if (error) {
    return databaseFailure(error.message);
  }

  if (!data) {
    return failure("User not found", 404);
  }

  return success(data);
}
