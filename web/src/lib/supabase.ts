import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Project URL만 남깁니다. /rest/v1 를 붙이면 PGRST125가 납니다. */
function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

/** 환경변수가 없으면 null을 반환해 설정 안내 화면을 보여줍니다. */
export function getSupabase(): SupabaseClient | null {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) return null;

  if (!client) {
    client = createClient(normalizeSupabaseUrl(rawUrl), anonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }

  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
