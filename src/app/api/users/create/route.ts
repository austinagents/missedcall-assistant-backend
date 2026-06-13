import { databaseFailure, parseJsonBody, success } from "@/lib/api";
import { toUserInsert } from "@/lib/mappers";
import { userCreateSchema } from "@/lib/schemas";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, userCreateSchema);

  if (!body.success) {
    return body.response;
  }

  const { data, error } = await supabaseService
    .from("users")
    .insert(toUserInsert(body.data))
    .select()
    .single();

  if (error) {
    return databaseFailure(error.message);
  }

  return success(data);
}
