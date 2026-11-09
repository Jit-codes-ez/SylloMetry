import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kwvzkctwmcufxhfkiaba.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_imaSPSE2rlCchKYsvFn0cw__9RMCrHh";

/**
 * Standard Supabase client instance configured for browser session persistence.
 * Uses browser localStorage for JWT access token and refresh token storage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "supabase_auth_session",
  },
});

export default supabase;

