import { useEffect, useState } from 'react'
import { TossAuth } from '@apps-in-toss/web-framework'
import {
  clearTossSession,
  loadTossSession,
  makeDisplayId,
  saveTossSession,
  type TossSession,
} from './tossSession.ts'

type AuthStatus = 'loading' | 'ready'

/**
 * 매직링크 대신 앱인토스 토스 로그인을 사용합니다.
 * - 클라이언트: TossAuth.login()으로 인가코드 획득
 * - AccessToken 교환·userKey 조회는 파트너 서버(mTLS)가 필요하므로
 *   현재는 로그인 성공 여부만 로컬 세션으로 유지합니다.
 */
export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<TossSession | null>(null)
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    let active = true
    loadTossSession()
      .then(saved => {
        if (!active) return
        setSession(saved)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setStatus('ready')
      })
    return () => {
      active = false
    }
  }, [])

  const signInWithToss = async () => {
    setAuthBusy(true)
    setAuthMessage('')
    try {
      // 토스앱/샌드박스/AIT Devtools에서 약관·로그인 창을 띄웁니다.
      const { authorizationCode, referrer } = await TossAuth.login()

      // 인가코드는 10분·일회성이라 오래 저장하지 않습니다.
      const nextSession: TossSession = {
        loggedIn: true,
        referrer,
        loggedInAt: new Date().toISOString(),
        displayId: makeDisplayId(authorizationCode),
      }
      await saveTossSession(nextSession)
      setSession(nextSession)
      setAuthMessage(
        referrer === 'SANDBOX'
          ? '샌드박스에서 토스 로그인했어요.'
          : '토스 로그인했어요.',
      )
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인에 실패했어요.'
      setAuthMessage(
        `${message} 토스앱 QR 테스트 또는 AIT Devtools에서 다시 시도해 주세요.`,
      )
      return false
    } finally {
      setAuthBusy(false)
    }
  }

  const signOut = async () => {
    setAuthBusy(true)
    setAuthMessage('')
    try {
      // 서버 mTLS 연동 전: 앱 로컬 세션만 종료합니다.
      // 토스앱 '연결 끊기' 콜백/토큰 폐기는 파트너 서버 준비 후 추가합니다.
      await clearTossSession()
      setSession(null)
      setAuthMessage('로그아웃했어요.')
    } finally {
      setAuthBusy(false)
    }
  }

  return {
    /** 토스 로그인은 SDK만 있으면 항상 사용 가능 */
    configured: true,
    status,
    session,
    user: session
      ? {
          id: session.displayId,
          label: '토스 로그인됨',
          referrer: session.referrer,
        }
      : null,
    authMessage,
    authBusy,
    signInWithToss,
    signOut,
    clearAuthMessage: () => setAuthMessage(''),
  }
}
