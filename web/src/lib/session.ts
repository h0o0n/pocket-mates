const CLIENT_KEY = "selectfood_client_key";
const SESSION_KEY = "selectfood_session";

export type LocalSession = {
  roomId: string;
  roomCode: string;
  participantId: string;
  nickname: string;
};

/** 브라우저별 익명 식별자. 로그인 없이 같은 기기 재입장을 위해 사용합니다. */
export function getClientKey(): string {
  let key = localStorage.getItem(CLIENT_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, key);
  }
  return key;
}

export function saveSession(session: LocalSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
