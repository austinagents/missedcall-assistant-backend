import { sendResendEmail, type EmailSendResult } from "./resend-client";

export type ProcessedVoicemailEmailInput = {
  callerNumber: string | null;
  transcript: string;
  summary: string;
  callerName: string | null;
  callbackNumber: string | null;
  urgency: "low" | "medium" | "high";
  actionItems: string;
  userEmail: string | null;
};

export async function sendVoicemailProcessedEmail(
  input: ProcessedVoicemailEmailInput,
): Promise<EmailSendResult> {
  if (!input.userEmail) {
    return { sent: false, error: "No user email available" };
  }

  const caller = input.callerName || input.callerNumber || "Unknown caller";

  return sendResendEmail({
    to: input.userEmail,
    subject: `WhoCalled: New voicemail from ${caller}`,
    text: `New voicemail from ${caller}

Summary:
${input.summary}

Caller:
${input.callerName || "Unknown"}

Callback number:
${input.callbackNumber || "Not provided"}

Urgency:
${input.urgency || "unknown"}

Action items:
${input.actionItems || "None"}

Transcript:
${input.transcript}

Sent by WhoCalled`,
  });
}
