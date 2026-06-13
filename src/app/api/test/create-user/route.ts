import { z } from "zod";

import { databaseFailure, parseJsonBody, success } from "@/lib/api";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const testCreateUserSchema = z.object({
  email: z.email(),
  auth_provider: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, testCreateUserSchema);

  if (!body.success) {
    return body.response;
  }

  const { data, error } = await supabaseService
    .from("users")
    .insert({
      email: body.data.email,
      auth_provider: body.data.auth_provider,
    })
    .select()
    .single();

  if (error) {
    return databaseFailure(error.message);
  }

  return success(data);
}
