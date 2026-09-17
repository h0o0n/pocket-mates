import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
/** Vercel에는 ANON_KEY, 예전 예시에는 PUBLISHABLE_KEY를 쓸 수 있어 둘 다 허용합니다. */
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
) as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

/**
 * DB/동기화용 클라이언트입니다.
 * 사용자 인증은 토스 로그인을 쓰고, Supabase Auth(매직링크)는 사용하지 않습니다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null
