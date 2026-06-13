const texmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="3"/>
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
