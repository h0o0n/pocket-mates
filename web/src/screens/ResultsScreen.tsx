import { useMemo, useState } from "react";
import { rankMenus, type AnswerMap } from "../lib/scoring";

type Props = {
  nicknames: string[];
  answerList: AnswerMap[];
  onRestart: () => void;
};

export function ResultsScreen({ nicknames, answerList, onRestart }: Props) {
  const [reroll, setReroll] = useState(0);
  const topMenus = useMemo(() => rankMenus(answerList, reroll), [answerList, reroll]);

  return (
    <section className="screen active" id="results">
      <div className="result-head">
        <span className="eyebrow">오늘의 교집합 발견!</span>
        <h2>
          우리 모두를 위한
          <br />
          <em>메뉴 TOP 3</em>
        </h2>
        <p>
          {nicknames.join(", ")} {nicknames.length}명의 답변에서 가장 많이 겹친 취향이에요.
        </p>
      </div>

      <div className="result-grid">
        {topMenus.map((menu, index) => (
          <article className="result-card" key={`${menu.name}-${reroll}-${index}`}>
            <span className="rank">{index + 1}위</span>
            <span className="menu-emoji">{menu.emoji}</span>
            <h3>{menu.name}</h3>
            <div className="match">취향 일치 {menu.match}%</div>
            <p className="reason">{menu.reason}</p>
            <div className="tags">
              {menu.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="result-actions">
        <button className="secondary" type="button" onClick={() => setReroll((value) => value + 1)}>
          ↻ 다른 후보 보기
        </button>
        <button className="primary" type="button" onClick={onRestart}>
          처음부터 다시
        </button>
      </div>

      <details className="logic">
        <summary>어떻게 골랐나요?</summary>
        <p>
          모든 멤버의 음식 종류, 맛, 온도, 든든함, 예산 선호를 합산하고 못 먹는 음식은 제외했어요. 한 사람만
          아주 좋아하는 메뉴보다 모두가 고르게 만족하는 메뉴를 우선했어요.
        </p>
      </details>
    </section>
  );
}
