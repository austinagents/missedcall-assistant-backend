import { supabaseService } from "@/lib/supabase";
import { productionUrl } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const twiml = await buildGreetingCaptureTwiml(request, "GET");
  return twimlResponse(twiml);
}

export async function POST(request: Request): Promise<Response> {
  const twiml = await buildGreetingCaptureTwiml(request, "POST");
  return twimlResponse(twiml);
}

async function buildGreetingCaptureTwiml(
  request: Request,
  method: "GET" | "POST",
): Promise<string> {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? "";
  const done = url.searchParams.get("done") === "1";
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
    done,
    recordingCallbackUrl: callbackUrl,
    actionUrl,
  });

  if (done) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
  }

  if (userId) {
    const { error } = await supabaseService
      .from("users")
      .update({
        greeting_recording_sid: null,
        greeting_recording_url: null,
      })
      .eq("id", userId);

    if (error) {
      console.log("[Twilio] greeting-capture reset failed", {
        userId,
        error: error.message,
      });
    } else {
      console.log("[Twilio] greeting-capture reset existing greeting", { userId });
    }
  }

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
