import { databaseFailure, parseJsonBody, success } from "@/lib/api";
import { toVoicemailInsert } from "@/lib/mappers";
import { voicemailCreateSchema } from "@/lib/schemas";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, voicemailCreateSchema);

  if (!body.success) {
    return body.response;
  }

  const { data, error } = await supabaseService
    .from("voicemails")
    .insert(toVoicemailInsert(body.data))
    .select()
    .single();

  if (error) {
    return databaseFailure(error.message);
  }

  return success(data);
}
