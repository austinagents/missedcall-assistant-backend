import OpenAI, { toFile } from "openai";
import { z } from "zod";

import { env } from "./env";

const transcriptionModel = "gpt-4o-mini-transcribe";
const primaryInsightsModel = "gpt-4.1-mini";
const fallbackInsightsModel = "gpt-4o-mini";

const voicemailInsightsSchema = z.object({
  summary: z.string().trim().min(1),
  caller_name: z.string().trim().min(1).nullable(),
  callback_number: z.string().trim().min(1).nullable(),
  urgency: z.enum(["low", "medium", "high"]),
  action_items: z.string().trim().min(1),
});

export type VoicemailInsights = z.infer<typeof voicemailInsightsSchema>;

export async function transcribeVoicemailAudio(recordingSid: string): Promise<string> {
  const openai = getOpenAIClient();

  if (!recordingSid.startsWith("RE")) {
    throw new Error("Valid Twilio recordingSid is required");
  }

  const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    env.TWILIO_ACCOUNT_SID,
  )}/Recordings/${encodeURIComponent(recordingSid)}.mp3`;

  const response = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
      ).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Twilio recording audio: ${response.status}`);
  }

  const audioBytes = Buffer.from(await response.arrayBuffer());
  const audioFile = await toFile(audioBytes, `${recordingSid}.mp3`, {
    type: "audio/mpeg",
  });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: transcriptionModel,
  });

  const text = transcription.text.trim();

  if (!text) {
    throw new Error("OpenAI transcription returned empty text");
  }

  return text;
}

export async function generateVoicemailInsights(
  transcript: string,
): Promise<VoicemailInsights> {
  try {
    return await generateVoicemailInsightsWithModel(primaryInsightsModel, transcript);
  } catch (error) {
    if (isModelUnavailableError(error)) {
      console.log("[OpenAI] primary insights model unavailable; using fallback", {
        primaryModel: primaryInsightsModel,
        fallbackModel: fallbackInsightsModel,
      });
      return generateVoicemailInsightsWithModel(fallbackInsightsModel, transcript);
    }

    throw error;
  }
}

async function generateVoicemailInsightsWithModel(
  model: string,
  transcript: string,
): Promise<VoicemailInsights> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are processing a voicemail for a missed-call assistant app.

Return valid JSON only.

No markdown.
No explanations.

Extract:

{
  "summary": string,
  "caller_name": string | null,
  "callback_number": string | null,
  "urgency": "low" | "medium" | "high",
  "action_items": string
}

Rules:
- summary should be concise and useful for an inbox card
- do not dump the full transcript into summary
- if caller name is not spoken, caller_name must be null
- if callback number is not spoken, callback_number must be null
- urgency should be high only for clearly urgent, emergency, or time-sensitive messages
- action_items should be plain text, short, and practical
- output must be parseable JSON`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
  });

  const content = response.choices[0]?.message.content;

  if (!content) {
    throw new Error("OpenAI summary returned empty content");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("OpenAI summary returned invalid JSON");
  }

  const parsed = voicemailInsightsSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "OpenAI summary JSON failed validation",
    );
  }

  return parsed.data;
}

function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for voicemail processing");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

function isModelUnavailableError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const status = error.status;
  const code = error.code;
  const message = error.message;

  return (
    status === 404 ||
    code === "model_not_found" ||
    (typeof message === "string" && message.toLowerCase().includes("model"))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
