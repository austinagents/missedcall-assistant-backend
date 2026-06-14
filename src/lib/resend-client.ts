import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type EmailSendResult =
  | { sent: true; id?: string }
  | { sent: false; error: string };

export async function sendResendEmail(
  input: SendEmailInput,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { sent: false, error: "RESEND_API_KEY is not configured" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "WhoCalled <voicemail@whocalled.pro>";
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  if (error) {
    return { sent: false, error: error.message };
  }

  return { sent: true, id: data?.id };
}
