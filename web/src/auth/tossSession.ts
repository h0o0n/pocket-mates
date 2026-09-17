import { Storage } from '@apps-in-toss/web-framework'

const SESSION_KEY = 'pocket-toss-session'

export type TossReferrer = 'DEFAULT' | 'SANDBOX'

export type TossSession = {
  loggedIn: true
  referrer: TossReferrer
  loggedInAt: string
  /** 표시용 짧은 식별자(인가코드는 저장하지 않음) */
  displayId: string
}

/**
 * 앱인토스 Storage를 우선 쓰고, 브라우저 단독 실행 시 localStorage로 폴백합니다.
 */
async function readRaw(key: string): Promise<string | null> {
  try {
    return await Storage.getItem(key)
  } catch {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  try {
    await Storage.setItem(key, value)
    return
  } catch {
    localStorage.setItem(key, value)
  }
}

async function removeRaw(key: string): Promise<void> {
  try {
    await Storage.removeItem(key)
  } catch {
    // Storage 미지원 환경
  }
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export async function loadTossSession(): Promise<TossSession | null> {
  const raw = await readRaw(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as TossSession
    if (parsed?.loggedIn === true && parsed.referrer && parsed.loggedInAt) {
      return parsed
    }
  } catch {
    // ignore corrupt payload
  }
  return null
}

export async function saveTossSession(session: TossSession): Promise<void> {
  await writeRaw(SESSION_KEY, JSON.stringify(session))
}

export async function clearTossSession(): Promise<void> {
  await removeRaw(SESSION_KEY)
}

/** 인가코드는 저장하지 않고, UI용 짧은 표시 ID만 만듭니다. */
export function makeDisplayId(authorizationCode: string): string {
  const slice = authorizationCode.slice(0, 8)
  return slice ? `toss-${slice}` : 'toss-user'
}
