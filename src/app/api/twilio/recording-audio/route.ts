import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const recordingSid = url.searchParams.get("recordingSid");

  if (!recordingSid || !recordingSid.startsWith("RE")) {
    return Response.json(
      { success: false, error: "Valid recordingSid is required" },
      { status: 400 },
    );
  }

  const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    env.TWILIO_ACCOUNT_SID,
  )}/Recordings/${encodeURIComponent(recordingSid)}.mp3`;

  const response = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
      ).toString("base64")}`,
    },
  });

  if (!response.ok) {
    return Response.json(
      { success: false, error: "Unable to fetch Twilio recording audio" },
      { status: response.status },
    );
  }

  const audioBytes = await response.arrayBuffer();

  return new Response(audioBytes, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
