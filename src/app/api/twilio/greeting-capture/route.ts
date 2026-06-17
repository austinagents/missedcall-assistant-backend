import { productionUrl } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return twimlResponse(buildGreetingCaptureTwiml(request));
}

export function POST(request: Request): Response {
  return twimlResponse(buildGreetingCaptureTwiml(request));
}

function buildGreetingCaptureTwiml(request: Request): string {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? "";
  const callbackUrl = productionUrl(
    `/api/twilio/recording?type=greeting&userId=${encodeURIComponent(userId)}`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="45"/>
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
