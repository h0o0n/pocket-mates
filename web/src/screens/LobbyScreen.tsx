import { useState } from "react";
import { AVATAR_COLORS } from "../data/questions";
import { MAX_MEMBERS } from "../lib/roomApi";
import { buildInviteText, buildInviteUrl } from "../lib/share";
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
  const canStart = participants.length >= 1;
  const [shareNote, setShareNote] = useState<string | null>(null);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setShareNote("입장 코드를 복사했어요.");
    } catch {
      setShareNote("복사에 실패했어요. 코드를 직접 알려 주세요.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(roomCode));
      setShareNote("초대 링크를 복사했어요.");
    } catch {
      setShareNote("링크 복사에 실패했어요.");
    }
  }

  async function copyKakaoText() {
    const text = buildInviteText(roomCode, locationName);
    try {
      if (navigator.share) {
        await navigator.share({ title: "오늘 뭐 먹지?", text });
        setShareNote("공유 시트를 열었어요.");
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote("카카오톡에 붙여넣을 문구를 복사했어요.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setShareNote("카카오톡에 붙여넣을 문구를 복사했어요.");
      } catch {
        setShareNote("공유 문구 복사에 실패했어요.");
      }
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
        <p className="sub">코드나 링크로 들어오면 바로 이 방에 합류해요.</p>

        <div className="code-box">
          <small>입장 코드</small>
          <strong>{roomCode}</strong>
          <button className="secondary" type="button" onClick={() => void copyCode()}>
            코드 복사
          </button>
        </div>

        <div className="share-actions">
          <button className="secondary" type="button" onClick={() => void copyLink()}>
            링크 복사
          </button>
          <button className="secondary" type="button" onClick={() => void copyKakaoText()}>
            카톡 문구 공유
          </button>
        </div>
        {shareNote ? <p className="share-note">{shareNote}</p> : null}

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
          💡 혼자 바로 시작해도 되고, 친구를 불러도 돼요. 최대 {MAX_MEMBERS}명. 각자 폰으로 답하고, 먼저 끝난
          사람은 결과를 기다리면 됩니다.
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
