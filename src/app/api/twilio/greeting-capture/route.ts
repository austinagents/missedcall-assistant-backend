import { productionUrl } from "@/lib/twilio";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleGreetingCapture(request, "GET");
}

export async function POST(request: Request): Promise<Response> {
  return handleGreetingCapture(request, "POST");
}

async function handleGreetingCapture(
  request: Request,
  method: "GET" | "POST",
): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? "";
  const done = url.searchParams.get("done") === "1";

  if (done) {
    console.log("[Twilio] greeting-capture done", {
      method,
      url: request.url,
      userId,
    });
    return twimlResponse(buildHangupTwiml());
  }

  const clearError = await clearExistingGreeting(userId);
  if (clearError) {
    return Response.json({ success: false, error: clearError }, { status: 500 });
  }

  const twiml = buildGreetingCaptureTwiml(request, method, userId);
  return twimlResponse(twiml);
}

function buildGreetingCaptureTwiml(
  request: Request,
  method: "GET" | "POST",
  userId: string,
): string {
  const callbackUrl = productionUrl(
    `/api/twilio/recording?type=greeting&userId=${encodeURIComponent(userId)}`,
  );
  const actionUrl = productionUrl(
    `/api/twilio/greeting-capture?userId=${encodeURIComponent(userId)}&done=1`,
  );

  console.log("[Twilio] greeting-capture hit", {
    method,
    url: request.url,
    userId,
    recordingCallbackUrl: callbackUrl,
    actionUrl,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record
    action="${escapeXml(actionUrl)}"
    method="POST"
    maxLength="15"
    timeout="3"
    playBeep="false"
    trim="trim-silence"
    recordingStatusCallback="${escapeXml(callbackUrl)}"
    recordingStatusCallbackMethod="POST"
    recordingStatusCallbackEvent="completed"
  />
  <Hangup/>
</Response>`;
}

async function clearExistingGreeting(userId: string): Promise<string | null> {
  if (!userId) {
    return null;
  }

  const { error } = await supabaseService
    .from("users")
    .update({
      greeting_recording_sid: null,
      greeting_recording_url: null,
    })
    .eq("id", userId);

  if (error) {
    console.log("[Twilio] greeting-capture clear failed", {
      userId,
      error: error.message,
    });
    return error.message;
  }

  console.log("[Twilio] greeting-capture cleared existing greeting", { userId });
  return null;
}

function buildHangupTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
}

function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
