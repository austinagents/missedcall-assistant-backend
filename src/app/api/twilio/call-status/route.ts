export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const userId = url.searchParams.get("userId");
  const formData = await request.formData();

  console.log("[Twilio] call status callback", {
    url: request.url,
    type,
    userId,
    CallSid: formValue(formData, "CallSid"),
    CallStatus: formValue(formData, "CallStatus"),
    CallDuration: formValue(formData, "CallDuration"),
    From: formValue(formData, "From"),
    To: formValue(formData, "To"),
    Direction: formValue(formData, "Direction"),
    AnsweredBy: formValue(formData, "AnsweredBy"),
    ApiVersion: formValue(formData, "ApiVersion"),
    AccountSid: formValue(formData, "AccountSid"),
  });

  return Response.json({ success: true });
}

export function GET(): Response {
  return Response.json({ success: true, route: "twilio-call-status" });
}

function formValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}
