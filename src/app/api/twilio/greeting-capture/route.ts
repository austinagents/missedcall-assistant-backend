import { productionUrl } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const twiml = buildGreetingCaptureTwiml(request, "GET");
  return twimlResponse(twiml);
}

export function POST(request: Request): Response {
  const twiml = buildGreetingCaptureTwiml(request, "POST");
  return twimlResponse(twiml);
}

function buildGreetingCaptureTwiml(request: Request, method: "GET" | "POST"): string {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? "";
  const callbackUrl = productionUrl(
    `/api/twilio/recording?type=greeting&userId=${encodeURIComponent(userId)}`,
  );

  console.log("[Twilio] greeting-capture hit", {
    method,
    url: request.url,
    userId,
    recordingCallbackUrl: callbackUrl,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record
    maxLength="30"
    timeout="10"
    playBeep="false"
    recordingStatusCallback="${escapeXml(callbackUrl)}"
    recordingStatusCallbackMethod="POST"
    recordingStatusCallbackEvent="completed absent failed"
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
