import { toFile } from "openai";
import { z } from "zod";

import {
  sendVoicemailProcessedEmail,
  type ProcessedVoicemailEmailInput,
} from "./email-notifications";
import { getOpenAIClient } from "./openai-client";
import type { EmailSendResult } from "./resend-client";

type VoicemailRow = {
  id: string;
  user_id: string;
  caller_number: string | null;
  recording_url: string | null;
};

type UserRow = {
  id: string;
  email: string | null;
};

type VoicemailInsights = {
  summary: string;
  caller_name: string | null;
  callback_number: string | null;
  urgency: "low" | "medium" | "high";
  action_items: string;
};

type ProcessedVoicemail = VoicemailInsights & {
  id: string;
  caller_number: string | null;
  transcript: string;
};

export type ProcessVoicemailResult = {
  voicemail: ProcessedVoicemail;
  email: EmailSendResult;
};

const insightsSchema = z.object({
  summary: z.string().trim().min(1),
  caller_name: z.string().trim().min(1).nullable(),
  callback_number: z.string().trim().min(1).nullable(),
  urgency: z.enum(["low", "medium", "high"]),
  action_items: z.string().trim().min(1),
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function processVoicemail(
  voicemailId: string,
): Promise<ProcessVoicemailResult> {
  console.log("[VoicemailProcess] start", { voicemailId });

  const voicemail = await loadVoicemail(voicemailId);

  console.log("[VoicemailProcess] loaded voicemail", { voicemailId });

  if (!voicemail.recording_url) {
    throw new Error("Voicemail does not have a recording_url");
  }

  const recordingSid = extractRecordingSid(voicemail.recording_url);

  if (!recordingSid) {
    throw new Error("Could not extract Twilio RecordingSid from recording_url");
  }

  console.log("[VoicemailProcess] recording sid extracted", {
    voicemailId,
    recordingSid,
  });

  await updateVoicemail(voicemailId, { processing_status: "processing" });

  try {
    console.log("[VoicemailProcess] transcription start", {
      voicemailId,
      recordingSid,
    });
    const transcript = await transcribeVoicemailAudio(recordingSid);
    console.log("[VoicemailProcess] transcription success", {
      voicemailId,
      recordingSid,
    });

    console.log("[VoicemailProcess] summary start", {
      voicemailId,
      recordingSid,
    });
    const insights = await generateVoicemailInsights(transcript);
    console.log("[VoicemailProcess] summary success", {
      voicemailId,
      recordingSid,
    });
    const callbackNumber = voicemail.caller_number;

    await updateVoicemail(voicemailId, {
      transcript,
      summary: insights.summary,
      caller_name: insights.caller_name,
      callback_number: callbackNumber,
      urgency: insights.urgency,
      action_items: insights.action_items,
      processing_status: "completed",
      processed_at: new Date().toISOString(),
    });

    console.log("[VoicemailProcess] update success", {
      voicemailId,
      recordingSid,
    });

    const processedVoicemail = {
      id: voicemailId,
      caller_number: voicemail.caller_number,
      transcript,
      summary: insights.summary,
      caller_name: insights.caller_name,
      callback_number: callbackNumber,
      urgency: insights.urgency,
      action_items: insights.action_items,
    };
    const email = await sendProcessedEmail(voicemail, processedVoicemail);

    if (email.sent) {
      await updateVoicemail(voicemailId, { email_sent: true });
    }

    return {
      voicemail: processedVoicemail,
      email,
    };
  } catch (error) {
    await updateVoicemail(voicemailId, { processing_status: "failed" }).catch(
      (updateError: unknown) => {
        console.log("[VoicemailProcess] failed status update failed", {
          voicemailId,
          error: errorMessage(updateError),
        });
      },
    );

    console.log("[VoicemailProcess] failed", {
      voicemailId,
      recordingSid,
      error: errorMessage(error),
    });

    throw error;
  }
}

export function extractRecordingSid(recordingUrl: string): string | null {
  const match = recordingUrl.match(/\/Recordings\/(RE[a-zA-Z0-9]+)/);

  return match?.[1] ?? null;
}

async function loadVoicemail(voicemailId: string): Promise<VoicemailRow> {
  const rows = await supabaseRequest<VoicemailRow[]>(
    `/rest/v1/voicemails?id=eq.${encodeURIComponent(
      voicemailId,
    )}&select=id,user_id,caller_number,recording_url`,
  );

  const voicemail = rows[0];

  if (!voicemail) {
    throw new VoicemailNotFoundError();
  }

  return voicemail;
}

async function loadUser(userId: string): Promise<UserRow | null> {
  const rows = await supabaseRequest<UserRow[]>(
    `/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,email`,
  );

  return rows[0] ?? null;
}

async function updateVoicemail(
  voicemailId: string,
  body: Record<string, string | boolean | null>,
): Promise<void> {
  await supabaseRequest(
    `/rest/v1/voicemails?id=eq.${encodeURIComponent(voicemailId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    },
  );
}

async function sendProcessedEmail(
  voicemail: VoicemailRow,
  processedVoicemail: ProcessedVoicemail,
): Promise<EmailSendResult> {
  try {
    const user = await loadUser(voicemail.user_id);
    const emailInput: ProcessedVoicemailEmailInput = {
      callerNumber: voicemail.caller_number,
      transcript: processedVoicemail.transcript,
      summary: processedVoicemail.summary,
      callerName: processedVoicemail.caller_name,
      callbackNumber: processedVoicemail.callback_number,
      urgency: processedVoicemail.urgency,
      actionItems: processedVoicemail.action_items,
      userEmail: user?.email ?? null,
    };

    return sendVoicemailProcessedEmail(emailInput);
  } catch (error) {
    return { sent: false, error: errorMessage(error) };
  }
}

async function transcribeVoicemailAudio(recordingSid: string): Promise<string> {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const openai = getOpenAIClient();
  const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    accountSid,
  )}/Recordings/${encodeURIComponent(recordingSid)}.mp3`;

  const response = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64",
      )}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Twilio recording audio: ${response.status}`);
  }

  const audioFile = await toFile(
    Buffer.from(await response.arrayBuffer()),
    `${recordingSid}.mp3`,
    { type: "audio/mpeg" },
  );

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "gpt-4o-mini-transcribe",
  });

  const text = transcription.text.trim();

  if (!text) {
    throw new Error("OpenAI transcription returned empty text");
  }

  return text;
}

async function generateVoicemailInsights(
  transcript: string,
): Promise<VoicemailInsights> {
  try {
    return await generateVoicemailInsightsWithModel("gpt-4.1-mini", transcript);
  } catch (error) {
    if (isModelUnavailableError(error)) {
      return generateVoicemailInsightsWithModel("gpt-4o-mini", transcript);
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
- summary should be short and useful for inbox card
- do not dump full transcript into summary
- caller_name null if not spoken
- callback_number null if not spoken
- urgency high only if clearly urgent/time-sensitive
- action_items short and practical`,
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

  const parsedJson: unknown = JSON.parse(content);
  const parsed = insightsSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "OpenAI summary JSON failed validation",
    );
  }

  return parsed.data;
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service environment is not configured");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown voicemail processing error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class VoicemailNotFoundError extends Error {
  constructor() {
    super("Voicemail not found");
    this.name = "VoicemailNotFoundError";
  }
}
