import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const { error } = await supabaseService.from("users").select("id").limit(1);

  if (error) {
    return Response.json(
      {
        success: false,
        database: "disconnected",
        error: error.message,
      },
      { status: 500 },
    );
  }

  return Response.json({
    success: true,
    database: "connected",
  });
}
