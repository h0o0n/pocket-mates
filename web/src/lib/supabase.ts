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
 * 화면이 없는 Supabase 익명 로그인을 사용하고 세션을 기기에 보관합니다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null

export const ensureAnonymousSession = async () => {
  if (!supabase) throw new Error('Supabase 환경변수가 필요합니다.')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (data.session) return data.session
  const signedIn = await supabase.auth.signInAnonymously()
  if (signedIn.error) throw signedIn.error
  if (!signedIn.data.session) throw new Error('익명 세션을 만들지 못했어요.')
  return signedIn.data.session
}
