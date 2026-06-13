export async function POST() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Please leave a message after the beep.</Say>
  <Record
    maxLength="60"
    recordingStatusCallback="https://missedcall-assistant-backend.vercel.app/api/twilio/recording"
    recordingStatusCallbackMethod="POST"
  />
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export async function GET() {
  return POST();
}
