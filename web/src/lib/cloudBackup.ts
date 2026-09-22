import { ensureAnonymousSession, supabase } from './supabase.ts'

const CODE_PREFIX = 'NUN'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

const collectScopedData = (userHash: string) => {
  const prefix = `pocket:u:${userHash}:`
  const entries: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) entries[key.slice(prefix.length)] = localStorage.getItem(key) ?? ''
  }
  return entries
}

const restoreScopedData = (userHash: string, entries: Record<string, string>) => {
  const prefix = `pocket:u:${userHash}:`
  Object.entries(entries).forEach(([suffix, value]) => {
    if (!suffix || suffix.includes('..')) return
    localStorage.setItem(`${prefix}${suffix}`, value)
  })
}

export const createPersonalBackup = async (userHash: string): Promise<string> => {
  if (!supabase) throw new Error('Supabase가 연결되지 않았어요.')
  await ensureAnonymousSession()

  const backupId = crypto.getRandomValues(new Uint8Array(16))
  const keyBytes = crypto.getRandomValues(new Uint8Array(32))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
  const payload = encoder.encode(JSON.stringify({ version: 1, entries: collectScopedData(userHash) }))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload)
  const id = toBase64Url(backupId)

  const { error } = await supabase.from('encrypted_backups').insert({
    id,
    ciphertext: toBase64Url(new Uint8Array(encrypted)),
    iv: toBase64Url(iv),
  })
  if (error) throw error
  return `${CODE_PREFIX}-${id}.${toBase64Url(keyBytes)}`
}

export const restorePersonalBackup = async (userHash: string, rawCode: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase가 연결되지 않았어요.')
  await ensureAnonymousSession()
  const code = rawCode.trim().replace(/\s/g, '')
  const match = /^NUN-([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(code)
  if (!match) throw new Error('백업 코드 형식을 확인해 주세요.')

  const { data, error } = await supabase.rpc('read_encrypted_backup', { p_id: match[1] })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.ciphertext || !row?.iv) throw new Error('백업을 찾을 수 없거나 만료됐어요.')

  try {
    const key = await crypto.subtle.importKey('raw', fromBase64Url(match[2]), 'AES-GCM', false, ['decrypt'])
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(row.iv) },
      key,
      fromBase64Url(row.ciphertext),
    )
    const parsed = JSON.parse(decoder.decode(decrypted)) as { version: number; entries: Record<string, string> }
    if (parsed.version !== 1 || !parsed.entries) throw new Error('지원하지 않는 백업이에요.')
    restoreScopedData(userHash, parsed.entries)
  } catch {
    throw new Error('백업 코드가 손상되었거나 올바르지 않아요.')
  }
}
