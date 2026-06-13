import { createClient } from "@supabase/supabase-js";

import { env } from "./env";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          auth_provider: string | null;
          email: string | null;
          phone_number: string | null;
          carrier: string | null;
          forwarding_number: string | null;
          forwarding_enabled: boolean;
          greeting_status: string;
          push_notifications_enabled: boolean;
          email_notifications_enabled: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          auth_provider?: string | null;
          email?: string | null;
          phone_number?: string | null;
          carrier?: string | null;
          forwarding_number?: string | null;
          forwarding_enabled?: boolean;
          greeting_status?: string;
          push_notifications_enabled?: boolean;
          email_notifications_enabled?: boolean;
        };
        Update: {
          updated_at?: string;
          auth_provider?: string | null;
          email?: string | null;
          phone_number?: string | null;
          carrier?: string | null;
          forwarding_number?: string | null;
          forwarding_enabled?: boolean;
          greeting_status?: string;
          push_notifications_enabled?: boolean;
          email_notifications_enabled?: boolean;
        };
        Relationships: [];
      };
      voicemails: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          caller_number: string | null;
          recording_url: string | null;
          duration_seconds: number | null;
          transcript: string | null;
          email_sent: boolean;
          push_sent: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          caller_number?: string | null;
          recording_url?: string | null;
          duration_seconds?: number | null;
          transcript?: string | null;
          email_sent?: boolean;
          push_sent?: boolean;
        };
        Update: {
          caller_number?: string | null;
          recording_url?: string | null;
          duration_seconds?: number | null;
          transcript?: string | null;
          email_sent?: boolean;
          push_sent?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "voicemails_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_events: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          event_type: string | null;
          event_title: string | null;
          event_description: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          event_type?: string | null;
          event_title?: string | null;
          event_description?: string | null;
        };
        Update: {
          event_type?: string | null;
          event_title?: string | null;
          event_description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const supabaseAnon = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
);

export const supabaseService = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export type { Json };
