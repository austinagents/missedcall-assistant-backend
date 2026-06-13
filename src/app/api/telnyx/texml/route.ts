const texmlResponse = `<Response>
  <Say>Missed Call Assistant is connected.</Say>
  <Hangup/>
</Response>`;

export function GET(): Response {
  return new Response("TeXML endpoint ready", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
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
