import { env } from "./env";

const PRODUCTION_BASE_URL = "https://missedcall-assistant-backend.vercel.app";

type TwilioCallCreateResponse = {
  sid?: string;
};

export async function createGreetingImportCall(
  userId: string,
  toPhoneNumber: string,
): Promise<string> {
  const callbackUrl = new URL("/api/twilio/greeting-capture", PRODUCTION_BASE_URL);
  callbackUrl.searchParams.set("userId", userId);

  const body = new URLSearchParams({
    To: toPhoneNumber,
    From: env.TWILIO_PHONE_NUMBER,
    Url: callbackUrl.toString(),
    Method: "POST",
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      env.TWILIO_ACCOUNT_SID,
    )}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const responseBody: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    console.log("[Twilio] greeting import call failed", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("Twilio greeting import call failed");
  }

  const callResponse = responseBody as TwilioCallCreateResponse;

  if (!callResponse.sid) {
    throw new Error("Twilio call response did not include sid");
  }

  console.log("[Twilio] greeting import call created", {
    callSid: callResponse.sid,
    to: toPhoneNumber,
  });

  return callResponse.sid;
}

export function productionUrl(path: string): string {
  return new URL(path, PRODUCTION_BASE_URL).toString();
}
