const texmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Missed Call Assistant is connected.</Say>
  <Hangup/>
</Response>`;

export function GET(): Response {
  return new Response(texmlResponse, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

export function POST(): Response {
  return new Response(texmlResponse, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
