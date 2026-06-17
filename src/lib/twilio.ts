import { env } from "./env";

const PRODUCTION_BASE_URL = "https://missedcall-assistant-backend.vercel.app";

type TwilioCallCreateResponse = {
  sid?: string;
};

type TwilioErrorFields = {
  message: string;
  code?: string | number;
  status?: string | number;
  moreInfo?: string;
  details?: unknown;
};

class TwilioApiError extends Error {
  code?: string | number;
  status?: string | number;
  moreInfo?: string;
  details?: unknown;

  constructor(fields: TwilioErrorFields) {
    super(fields.message);
    this.name = "TwilioApiError";
    this.code = fields.code;
    this.status = fields.status;
    this.moreInfo = fields.moreInfo;
    this.details = fields.details;
  }
}

export async function createGreetingImportCall(
  userId: string,
  toPhoneNumber: string,
): Promise<string> {
  try {
    const callbackUrl = new URL("/api/twilio/greeting-capture", PRODUCTION_BASE_URL);
    callbackUrl.searchParams.set("userId", userId);
    const statusCallbackUrl = new URL("/api/twilio/call-status", PRODUCTION_BASE_URL);
    statusCallbackUrl.searchParams.set("type", "greeting-import");
    statusCallbackUrl.searchParams.set("userId", userId);

    const body = new URLSearchParams({
      To: toPhoneNumber,
      From: env.TWILIO_PHONE_NUMBER,
      Url: callbackUrl.toString(),
      Method: "POST",
      Record: "true",
      RecordingStatusCallback: productionUrl(`/api/twilio/recording?type=greeting&userId=${encodeURIComponent(userId)}`),
      RecordingStatusCallbackMethod: "POST",
      RecordingStatusCallbackEvent: "completed",
      Timeout: "60",
      StatusCallback: statusCallbackUrl.toString(),
      StatusCallbackMethod: "POST",
      StatusCallbackEvent: "initiated ringing answered completed",
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
      throw new TwilioApiError(parseTwilioError(responseBody, response.status));
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
  } catch (error) {
    const twilioError = normalizeTwilioError(error);

    console.log("[Twilio] greeting import call failed", {
      message: twilioError.message,
      code: twilioError.code,
      status: twilioError.status,
      moreInfo: twilioError.moreInfo,
      details: twilioError.details,
    });

    throw new Error(`Twilio greeting import call failed: ${twilioError.message}`);
  }
}

export function productionUrl(path: string): string {
  return new URL(path, PRODUCTION_BASE_URL).toString();
}

function parseTwilioError(body: unknown, fallbackStatus: number): TwilioErrorFields {
  if (!isRecord(body)) {
    return {
      message: "Unknown Twilio error",
      status: fallbackStatus,
    };
  }

  return {
    message: stringField(body, "message") ?? "Unknown Twilio error",
    code: stringOrNumberField(body, "code"),
    status: stringOrNumberField(body, "status") ?? fallbackStatus,
    moreInfo: stringField(body, "moreInfo") ?? stringField(body, "more_info"),
    details: body.details,
  };
}

function normalizeTwilioError(error: unknown): TwilioErrorFields {
  if (error instanceof TwilioApiError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "Unknown Twilio error",
  };
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function stringOrNumberField(
  record: Record<string, unknown>,
  key: string,
): string | number | undefined {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
