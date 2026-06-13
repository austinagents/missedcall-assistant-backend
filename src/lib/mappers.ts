import type { Database } from "./supabase";

type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
type VoicemailInsert = Database["public"]["Tables"]["voicemails"]["Insert"];

type UserCreateInput = {
  id?: string;
  authProvider?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  carrier?: string | null;
  forwardingNumber?: string | null;
  forwardingEnabled?: boolean;
  greetingStatus?: string | null;
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
};

type UserUpdateInput = {
  phoneNumber?: string | null;
  carrier?: string | null;
  forwardingNumber?: string | null;
  forwardingEnabled?: boolean;
  greetingStatus?: string | null;
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
};

type VoicemailCreateInput = {
  userId: string;
  callerNumber?: string | null;
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  transcript?: string | null;
  emailSent?: boolean;
  pushSent?: boolean;
};

export function toUserInsert(input: UserCreateInput): UserInsert {
  return {
    id: input.id,
    auth_provider: input.authProvider,
    email: input.email,
    phone_number: input.phoneNumber,
    carrier: input.carrier,
    forwarding_number: input.forwardingNumber,
    forwarding_enabled: input.forwardingEnabled,
    greeting_status: input.greetingStatus ?? undefined,
    push_notifications_enabled: input.pushNotificationsEnabled,
    email_notifications_enabled: input.emailNotificationsEnabled,
  };
}

export function toUserUpdate(input: UserUpdateInput): UserUpdate {
  return {
    updated_at: new Date().toISOString(),
    phone_number: input.phoneNumber,
    carrier: input.carrier,
    forwarding_number: input.forwardingNumber,
    forwarding_enabled: input.forwardingEnabled,
    greeting_status: input.greetingStatus ?? undefined,
    push_notifications_enabled: input.pushNotificationsEnabled,
    email_notifications_enabled: input.emailNotificationsEnabled,
  };
}

export function toVoicemailInsert(input: VoicemailCreateInput): VoicemailInsert {
  return {
    user_id: input.userId,
    caller_number: input.callerNumber,
    recording_url: input.recordingUrl,
    duration_seconds: input.durationSeconds,
    transcript: input.transcript,
    email_sent: input.emailSent,
    push_sent: input.pushSent,
  };
}
