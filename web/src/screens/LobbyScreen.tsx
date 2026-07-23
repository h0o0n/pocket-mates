import { AVATAR_COLORS } from "../data/questions";
import { MAX_MEMBERS } from "../lib/roomApi";
import type { Participant } from "../lib/types";

type Props = {
  roomCode: string;
  locationName?: string | null;
  participants: Participant[];
  meId: string;
  busy: boolean;
  error: string | null;
  onStart: () => Promise<void>;
  onLeave: () => void;
};

export function LobbyScreen({
  roomCode,
  locationName,
  participants,
  meId,
  busy,
  error,
  onStart,
  onLeave,
}: Props) {
  const canStart = participants.length >= 2;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // 클립보드 실패는 무시하고 화면에 코드만 보여줍니다.
    }
  }

  return (
    <section className="screen active">
      <div className="panel compact">
        <button className="back" type="button" onClick={onLeave}>
          ← 나가기
        </button>
        <span className="step">대기실</span>
        <h2>친구들을 불러오세요</h2>
        <p className="sub">같은 입장 코드로 들어오면 바로 이 방에 합류해요.</p>

        <div className="code-box">
          <small>입장 코드</small>
          <strong>{roomCode}</strong>
          <button className="secondary" type="button" onClick={copyCode}>
            복사
          </button>
        </div>

        {locationName ? (
          <div className="location-chip">
            <small>만날 위치</small>
            <strong>{locationName}</strong>
          </div>
        ) : null}

        <div className="member-list">
          {participants.map((person, index) => (
            <div className="member" key={person.id}>
              <span className="mini-avatar" style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>
                {person.nickname[0]}
              </span>
              <strong>
                {person.nickname}
                {person.id === meId ? " (나)" : ""}
              </strong>
              <em className="ready-tag">대기 중</em>
            </div>
          ))}
        </div>

        <div className="tip">
          💡 2명 이상 모이면 시작할 수 있어요. 최대 {MAX_MEMBERS}명. 각자 폰으로 답하고, 먼저 끝난 사람은 결과를
          기다리면 됩니다.
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary full" type="button" disabled={!canStart || busy} onClick={() => void onStart()}>
          {busy ? "시작 중..." : "질문 시작하기"}
          {!busy ? <span>→</span> : null}
        </button>
      </div>
    </section>
  );
}
