import { env } from "./env";

const TELNYX_API_BASE_URL = "https://api.telnyx.com/v2";
const TEST_MESSAGE = "Missed Call Assistant is connected.";

type TelnyxCommandName = "answer" | "speak" | "hangup";

type TelnyxCommandBody = Record<string, string | boolean | number>;

export async function answerCall(callControlId: string): Promise<void> {
  await sendCallControlCommand(callControlId, "answer");
}

export async function speakTestMessage(callControlId: string): Promise<void> {
  await sendCallControlCommand(callControlId, "speak", {
    payload: TEST_MESSAGE,
    voice: "female",
    language: "en-US",
  });
}

export async function hangupCall(callControlId: string): Promise<void> {
  await sendCallControlCommand(callControlId, "hangup");
}

async function sendCallControlCommand(
  callControlId: string,
  command: TelnyxCommandName,
  body?: TelnyxCommandBody,
): Promise<void> {
  const url = `${TELNYX_API_BASE_URL}/calls/${encodeURIComponent(
    callControlId,
  )}/actions/${command}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        `[Telnyx] command=${command} status=${response.status} error=${errorText.slice(
          0,
          500,
        )}`,
      );
      return;
    }

    console.log(`[Telnyx] command=${command} status=${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`[Telnyx] command=${command} status=failed error=${message}`);
  }
}
