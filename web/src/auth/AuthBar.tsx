import { Button } from '@toss/tds-mobile'

type TossUser = {
  id: string
  label: string
  referrer: 'DEFAULT' | 'SANDBOX'
}

type Props = {
  configured: boolean
  status: 'loading' | 'ready'
  user: TossUser | null
  authMessage: string
  authBusy: boolean
  onSignInWithToss: () => Promise<boolean>
  onSignOut: () => Promise<void>
}

/** 상단 토스 로그인 / 로그아웃 UI */
export function AuthBar({
  configured,
  status,
  user,
  authMessage,
  authBusy,
  onSignInWithToss,
  onSignOut,
}: Props) {
  if (!configured) {
    return <p className="auth-note">로그인 설정이 아직 없어요.</p>
  }

  if (status === 'loading') {
    return <p className="auth-note">로그인 확인 중이에요…</p>
  }

  if (user) {
    return (
      <div className="auth-bar">
        <span className="auth-user" title={user.id}>
          {user.label}
          {user.referrer === 'SANDBOX' ? ' · 테스트' : ''}
        </span>
        <Button
          size="small"
          color="dark"
          variant="weak"
          display="inline"
          loading={authBusy}
          onClick={() => void onSignOut()}
        >
          로그아웃
        </Button>
        {authMessage && (
          <p className="auth-feedback" role="status">
            {authMessage}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="auth-bar">
      <Button
        size="small"
        color="primary"
        variant="fill"
        display="inline"
        loading={authBusy}
        onClick={() => void onSignInWithToss()}
      >
        토스로 로그인
      </Button>
      {authMessage && (
        <p className="auth-feedback" role="status">
          {authMessage}
        </p>
      )}
    </div>
  )
}
