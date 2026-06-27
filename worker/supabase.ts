import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assertSupabaseConfigured, config } from "./config.js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  assertSupabaseConfigured();

  if (!client) {
    client = createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return client;
}
