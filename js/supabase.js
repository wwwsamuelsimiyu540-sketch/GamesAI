/* Supabase browser client. The publishable key is designed for frontend use.
   Database security is enforced by Row Level Security policies. Never put a service-role
   or secret key in this file. */
(function () {
  const SUPABASE_URL = "https://hdxzbhzexwxrpfsoutnc.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jJFz6N3ViOxuQjL72btxSQ_nZHkA5Kt";
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    window.supabaseConnectionError = "Supabase client library did not load. Check your internet connection and reload.";
    return;
  }
  window.sportsSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
})();