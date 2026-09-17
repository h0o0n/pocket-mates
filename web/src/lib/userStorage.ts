import { User } from '@apps-in-toss/web-framework'

/** 마지막에 성공한 식별키(디버깅·재시도용) */
const LAST_HASH_KEY = 'pocket-user-hash'
/** 토스앱 밖(로컬 Vite)에서 쓸 기기 단위 폴백 ID */
const LOCAL_USER_KEY = 'pocket-local-user-id'
/** 레거시(비스코프) → 식별키 스코프 마이그레이션 완료 플래그 접미사 */
const MIGRATED_FLAG = 'migrated-v1'

/**
 * 저장 키를 사용자 식별키 아래로 묶습니다.
 * 예: scopedKey('abc', 'plan') → pocket:u:abc:plan
 */
export const scopedKey = (userHash: string, suffix: string): string =>
  `pocket:u:${userHash}:${suffix}`

const isLegacyPocketKey = (key: string): boolean => {
  if (!key.startsWith('pocket-')) return false
  // 식별·세션 메타는 마이그레이션 대상이 아닙니다.
  if (key === LAST_HASH_KEY || key === LOCAL_USER_KEY) return false
  if (key === 'pocket-toss-session') return false
  return true
}

/**
 * 예전 `pocket-*` 키를 현재 사용자 스코프로 한 번만 옮깁니다.
 * 이미 스코프 데이터가 있으면 덮어쓰지 않습니다.
 */
export const migrateLegacyKeys = (userHash: string): void => {
  const flagKey = scopedKey(userHash, MIGRATED_FLAG)
  try {
    if (localStorage.getItem(flagKey)) return

    // 이미 스코프된 핵심 데이터가 있으면 레거시만 건너뜁니다.
    const hasScopedPlan = localStorage.getItem(scopedKey(userHash, 'plan'))
    if (!hasScopedPlan) {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (!key || !isLegacyPocketKey(key)) continue
        const suffix = key.slice('pocket-'.length)
        const nextKey = scopedKey(userHash, suffix)
        if (localStorage.getItem(nextKey) != null) continue
        const value = localStorage.getItem(key)
        if (value != null) localStorage.setItem(nextKey, value)
      }
    }

    localStorage.setItem(flagKey, '1')
  } catch {
    // private mode 등에서는 마이그레이션을 건너뜁니다.
  }
}

const makeLocalUserId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `local-${crypto.randomUUID()}`
    }
  } catch {
    // ignore
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 비게임 미니앱 사용자 식별키를 발급합니다.
 * - 토스앱: User.getAnonymousKey()
 * - 로컬/미지원: 기기 폴백 ID (개발용)
 */
export const resolveUserHash = async (): Promise<string> => {
  try {
    const result = await User.getAnonymousKey()
    if (result?.type === 'HASH' && result.hash) {
      try {
        localStorage.setItem(LAST_HASH_KEY, result.hash)
      } catch {
        // ignore
      }
      return result.hash
    }
  } catch {
    // 샌드박스 밖·구버전·브라우저 단독 실행
  }

  try {
    const cached = localStorage.getItem(LAST_HASH_KEY)
    if (cached) return cached
  } catch {
    // ignore
  }

  try {
    let localId = localStorage.getItem(LOCAL_USER_KEY)
    if (!localId) {
      localId = makeLocalUserId()
      localStorage.setItem(LOCAL_USER_KEY, localId)
    }
    return localId
  } catch {
    return makeLocalUserId()
  }
}

export const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export const saveJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota / private mode
  }
}
