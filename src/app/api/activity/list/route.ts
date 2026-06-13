import { databaseFailure, parseSearchParams, success } from "@/lib/api";
import { activityListQuerySchema } from "@/lib/schemas";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const query = parseSearchParams(request, activityListQuerySchema);

  if (!query.success) {
    return query.response;
  }

  const { data, error } = await supabaseService
    .from("activity_events")
    .select()
    .eq("user_id", query.data.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return databaseFailure(error.message);
  }

  return success(data);
}
