import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabase";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type RecordingFields = {
  callSid: string | null;
  recordingSid: string | null;
  recordingUrl: string | null;
  recordingDuration: string | null;
  from: string | null;
  to: string | null;
};

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "voicemail";
  const userId = url.searchParams.get("userId");
  const formData = await request.formData();
  const fields = getRecordingFields(formData);

  console.log("[Twilio] recording callback", {
    type,
    CallSid: fields.callSid,
    RecordingSid: fields.recordingSid,
    RecordingUrl: fields.recordingUrl,
    RecordingDuration: fields.recordingDuration,
    From: fields.from,
    To: fields.to,
  });

  if (type === "greeting") {
    return saveGreetingRecording(userId, fields);
  }

  return saveVoicemailRecording(type, fields);
}

export async function GET(): Promise<Response> {
  return Response.json({ success: true, route: "twilio-recording" });
}

async function saveGreetingRecording(
  userId: string | null,
  fields: RecordingFields,
): Promise<Response> {
  if (!userId) {
    return Response.json(
      { success: false, error: "Missing userId for greeting recording" },
      { status: 400 },
    );
  }

  const { data: user, error: userError } = await supabaseService
    .from("users")
    .select()
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    return Response.json({ success: false, error: userError.message }, { status: 500 });
  }

  if (!user) {
    return Response.json(
      { success: false, error: "Invalid userId for greeting recording" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabaseService
    .from("users")
    .update({
      greeting_recording_url: fields.recordingUrl,
      greeting_recording_sid: fields.recordingSid,
      greeting_status: "imported",
    })
    .eq("id", user.id);

  if (updateError) {
    return Response.json({ success: false, error: updateError.message }, { status: 500 });
  }

  await createActivityEvent(user.id, {
    eventType: "greeting_imported",
    eventTitle: "Greeting imported",
    eventDescription: "Recording saved",
  });

  return Response.json({ success: true });
}

async function saveVoicemailRecording(
  type: string,
  fields: RecordingFields,
): Promise<Response> {
  const user = await findUserForVoicemail(fields.to);

  if (!user) {
    return Response.json(
      {
        success: false,
        error: "No user found for voicemail recording",
        type,
        From: fields.from,
        To: fields.to,
        CallSid: fields.callSid,
        RecordingSid: fields.recordingSid,
      },
      { status: 404 },
    );
  }

  const { error: voicemailError } = await supabaseService.from("voicemails").insert({
    user_id: user.id,
    caller_number: fields.from,
    recording_url: fields.recordingUrl,
    duration_seconds: parseDurationSeconds(fields.recordingDuration),
    email_sent: false,
    push_sent: false,
  });

  if (voicemailError) {
    return Response.json({ success: false, error: voicemailError.message }, { status: 500 });
  }

  await createActivityEvent(user.id, {
    eventType: "voicemail_received",
    eventTitle: "Voicemail received",
    eventDescription: fields.from ?? "Unknown caller",
  });

  return Response.json({ success: true });
}

async function findUserForVoicemail(toNumber: string | null): Promise<UserRow | null> {
  if (toNumber) {
    const { data, error } = await supabaseService
      .from("users")
      .select()
      .eq("assistant_number", toNumber)
      .maybeSingle();

    if (error) {
      console.log("[Twilio] voicemail user lookup failed", {
        toNumber,
        error: error.message,
      });
    }

    if (data) {
      return data;
    }
  }

  // TODO: Remove TEST_USER_ID fallback after per-user assistant number routing is live.
  if (env.TEST_USER_ID) {
    const { data, error } = await supabaseService
      .from("users")
      .select()
      .eq("id", env.TEST_USER_ID)
      .maybeSingle();

    if (error) {
      console.log("[Twilio] voicemail TEST_USER_ID fallback lookup failed", {
        error: error.message,
      });
    }

    return data;
  }

  return null;
}

async function createActivityEvent(
  userId: string,
  event: {
    eventType: string;
    eventTitle: string;
    eventDescription: string;
  },
): Promise<void> {
  const { error } = await supabaseService.from("activity_events").insert({
    user_id: userId,
    event_type: event.eventType,
    event_title: event.eventTitle,
    event_description: event.eventDescription,
  });

  if (error) {
    console.log("[Twilio] activity event insert failed", { error: error.message });
  }
}

function getRecordingFields(formData: FormData): RecordingFields {
  return {
    callSid: formValue(formData, "CallSid"),
    recordingSid: formValue(formData, "RecordingSid"),
    recordingUrl: formValue(formData, "RecordingUrl"),
    recordingDuration: formValue(formData, "RecordingDuration"),
    from: formValue(formData, "From"),
    to: formValue(formData, "To"),
  };
}

function formValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function parseDurationSeconds(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
