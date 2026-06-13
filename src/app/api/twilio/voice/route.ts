import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabase";
import { productionUrl } from "@/lib/twilio";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

const voicemailRecordingCallback = productionUrl(
  "/api/twilio/recording?type=voicemail",
);

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const toNumber = formValue(formData, "To");
  const user = await findUserForAssistantNumber(toNumber);

  return twimlResponse(buildInboundVoicemailTwiml(user));
}

export async function GET(): Promise<Response> {
  const user = await findUserForAssistantNumber(null);

  return twimlResponse(buildInboundVoicemailTwiml(user));
}

function buildInboundVoicemailTwiml(user: UserRow | null): string {
  const recordVerb = `<Record
    maxLength="60"
    recordingStatusCallback="${escapeXml(voicemailRecordingCallback)}"
    recordingStatusCallbackMethod="POST"
  />`;

  if (user?.greeting_recording_url) {
    const playUrl = toPlayableTwilioRecordingUrl(user.greeting_recording_url);

    console.log("[Twilio] inbound greeting playback", {
      greeting_recording_url: user.greeting_recording_url,
      playUrl,
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(playUrl)}</Play>
  ${recordVerb}
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Please leave a message after the beep.</Say>
  ${recordVerb}
</Response>`;
}

async function findUserForAssistantNumber(toNumber: string | null): Promise<UserRow | null> {
  if (toNumber) {
    const { data, error } = await supabaseService
      .from("users")
      .select()
      .eq("assistant_number", toNumber)
      .maybeSingle();

    if (error) {
      console.log("[Twilio] user lookup by assistant_number failed", {
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
      console.log("[Twilio] TEST_USER_ID fallback lookup failed", {
        error: error.message,
      });
    }

    return data;
  }

  return null;
}

function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

function formValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function toPlayableTwilioRecordingUrl(url: string): string {
  if (url.endsWith(".mp3") || url.endsWith(".wav")) return url;
  if (url.includes("/Recordings/RE")) return `${url}.mp3`;
  return url;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
