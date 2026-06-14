import { failure, parseJsonBody } from "@/lib/api";
import {
  generateVoicemailInsights,
  transcribeVoicemailAudio,
} from "@/lib/openai";
import { voicemailProcessSchema } from "@/lib/schemas";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, voicemailProcessSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const { voicemailId } = parsed.data;

  console.log("[VoicemailProcess] start", { voicemailId });

  const { data: voicemail, error: loadError } = await supabaseService
    .from("voicemails")
    .select()
    .eq("id", voicemailId)
    .maybeSingle();

  if (loadError) {
    console.log("[VoicemailProcess] failed", {
      voicemailId,
      error: loadError.message,
    });
    return failure(loadError.message, 500);
  }

  if (!voicemail) {
    console.log("[VoicemailProcess] failed", {
      voicemailId,
      error: "Voicemail not found",
    });
    return failure("Voicemail not found", 404);
  }

  console.log("[VoicemailProcess] loaded voicemail", { voicemailId });

  const recordingSid =
    voicemail.recording_sid ?? deriveRecordingSid(voicemail.recording_url);

  if (!recordingSid) {
    console.log("[VoicemailProcess] failed", {
      voicemailId,
      error: "No recordingSid available",
    });
    return failure("No recordingSid available", 400);
  }

  console.log("[VoicemailProcess] recording sid resolved", {
    voicemailId,
    recordingSid,
  });

  const { error: processingError } = await supabaseService
    .from("voicemails")
    .update({ processing_status: "processing" })
    .eq("id", voicemailId);

  if (processingError) {
    console.log("[VoicemailProcess] failed", {
      voicemailId,
      recordingSid,
      error: processingError.message,
    });
    return failure(processingError.message, 500);
  }

  try {
    console.log("[VoicemailProcess] transcription start", {
      voicemailId,
      recordingSid,
    });
    const transcript = await transcribeVoicemailAudio(recordingSid);
    console.log("[VoicemailProcess] transcription success", {
      voicemailId,
      recordingSid,
    });

    console.log("[VoicemailProcess] summary start", {
      voicemailId,
      recordingSid,
    });
    const insights = await generateVoicemailInsights(transcript);
    console.log("[VoicemailProcess] summary success", {
      voicemailId,
      recordingSid,
    });

    const { error: updateError } = await supabaseService
      .from("voicemails")
      .update({
        transcript,
        summary: insights.summary,
        caller_name: insights.caller_name,
        callback_number: insights.callback_number,
        urgency: insights.urgency,
        action_items: insights.action_items,
        processing_status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", voicemailId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log("[VoicemailProcess] database update success", {
      voicemailId,
      recordingSid,
    });

    return Response.json({
      success: true,
      voicemail: {
        id: voicemailId,
        transcript,
        summary: insights.summary,
        caller_name: insights.caller_name,
        callback_number: insights.callback_number,
        urgency: insights.urgency,
        action_items: insights.action_items,
      },
    });
  } catch (error) {
    const message = errorMessage(error);

    await supabaseService
      .from("voicemails")
      .update({ processing_status: "failed" })
      .eq("id", voicemailId);

    console.log("[VoicemailProcess] failed", {
      voicemailId,
      recordingSid,
      error: message,
    });

    return failure(message, 500);
  }
}

function deriveRecordingSid(recordingUrl: string | null): string | null {
  if (!recordingUrl) return null;

  const match = recordingUrl.match(/\/Recordings\/(RE[a-zA-Z0-9]+)/);

  return match?.[1] ?? null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown voicemail processing error";
}
