import { AVATAR_COLORS } from "../data/questions";
import type { Participant } from "../lib/types";

type Props = {
  participants: Participant[];
  meId: string;
};

export function WaitingScreen({ participants, meId }: Props) {
  const doneCount = participants.filter((person) => person.is_done).length;

  return (
    <section className="screen active">
      <div className="panel handoff-panel">
        <div className="handoff-icon">⏳</div>
        <span className="step">답변 제출 완료</span>
        <h2>다른 친구들을 기다리는 중</h2>
        <p>
          먼저 끝낸 사람은 여기서 잠시 쉬면 돼요.
          <br />
          모두가 답하면 메뉴 TOP 3가 자동으로 열려요.
        </p>

        <div className="wait-progress">
          <strong>
            {doneCount} / {participants.length} 명 완료
          </strong>
        </div>

        <div className="member-list wait-list">
          {participants.map((person, index) => (
            <div className="member" key={person.id}>
              <span className="mini-avatar" style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>
                {person.nickname[0]}
              </span>
              <strong>
                {person.nickname}
                {person.id === meId ? " (나)" : ""}
              </strong>
              <em className={`ready-tag ${person.is_done ? "done" : ""}`}>
                {person.is_done ? "완료" : "응답 중"}
              </em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
