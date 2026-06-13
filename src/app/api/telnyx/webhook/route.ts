type TelnyxPhoneNumber = {
  phone_number?: string;
};

type TelnyxWebhookDataPayload = {
  event_type?: string;
  call_control_id?: string;
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
  const fromNumber = payload?.data?.payload?.from?.phone_number;
  const toNumber = payload?.data?.payload?.to?.phone_number;

  console.log("[Telnyx] Voice webhook received", {
    eventType: eventType ?? "unknown",
    callControlId: callControlId ?? "missing",
    fromNumber: fromNumber ?? "missing",
    toNumber: toNumber ?? "missing",
  });

  return Response.json({
    success: true,
    received: true,
  });
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
