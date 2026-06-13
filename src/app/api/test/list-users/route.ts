import { databaseFailure, success } from "@/lib/api";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseService
    .from("users")
    .select()
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return databaseFailure(error.message);
  }

  return success(data);
}
