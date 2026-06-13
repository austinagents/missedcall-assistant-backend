import { answerCall, hangupCall, speakTestMessage } from "@/lib/telnyx";

type TelnyxPhoneNumber = {
  phone_number?: string;
};

type TelnyxWebhookDataPayload = {
  event_type?: string;
  call_control_id?: string;
  call_leg_id?: string;
  call_session_id?: string;
  from?: TelnyxPhoneNumber;
  to?: TelnyxPhoneNumber;
};

type TelnyxWebhookData = {
  event_type?: string;
  payload?: TelnyxWebhookDataPayload;
};

type TelnyxWebhookPayload = {
  data?: TelnyxWebhookData;
};

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    success: true,
    provider: "telnyx",
    webhook: "ready",
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await readPayload(request);
  const eventType = payload?.data?.event_type ?? payload?.data?.payload?.event_type;
  const callControlId = payload?.data?.payload?.call_control_id;
  const callLegId = payload?.data?.payload?.call_leg_id;
  const callSessionId = payload?.data?.payload?.call_session_id;
  const fromNumber = payload?.data?.payload?.from?.phone_number;
  const toNumber = payload?.data?.payload?.to?.phone_number;

  console.log(`[Telnyx] event_type=${eventType ?? "unknown"}`);
  console.log(`[Telnyx] call_control_id=${callControlId ?? "missing"}`);
  console.log(`[Telnyx] call_leg_id=${callLegId ?? "missing"}`);
  console.log(`[Telnyx] call_session_id=${callSessionId ?? "missing"}`);
  console.log(`[Telnyx] from=${fromNumber ?? "missing"}`);
  console.log(`[Telnyx] to=${toNumber ?? "missing"}`);

  if (callControlId) {
    await handleCallControlEvent(eventType, callControlId);
  } else {
    console.log("[Telnyx] call-control command skipped: missing call_control_id");
  }

  return Response.json({
    success: true,
    received: true,
  });
}

async function handleCallControlEvent(
  eventType: string | undefined,
  callControlId: string,
): Promise<void> {
  switch (eventType) {
    case "call.initiated":
      await answerCall(callControlId);
      return;
    case "call.answered":
      await speakTestMessage(callControlId);
      return;
    case "playback.ended":
    case "call.playback.ended":
      await hangupCall(callControlId);
      return;
    case "call.hangup":
      console.log("[Telnyx] call.hangup final status received");
      return;
    default:
      console.log(`[Telnyx] event ignored=${eventType ?? "unknown"}`);
  }
}

async function readPayload(request: Request): Promise<TelnyxWebhookPayload | null> {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      console.log("[Telnyx] Voice webhook malformed payload: expected object");
      return null;
    }

    return body as TelnyxWebhookPayload;
  } catch {
    console.log("[Telnyx] Voice webhook malformed payload: invalid JSON");
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
