export async function POST(request: Request) {
  const formData = await request.formData();

  console.log("Twilio recording callback", {
    CallSid: formData.get("CallSid"),
    RecordingSid: formData.get("RecordingSid"),
    RecordingUrl: formData.get("RecordingUrl"),
    RecordingDuration: formData.get("RecordingDuration"),
    From: formData.get("From"),
    To: formData.get("To"),
  });

  return Response.json({ success: true });
}

export async function GET() {
  return Response.json({ success: true, route: "twilio-recording" });
}
