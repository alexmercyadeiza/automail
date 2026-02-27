import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase configuration for service client");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });
}
