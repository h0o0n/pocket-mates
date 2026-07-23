type Props = {
  onCreate: () => void;
  onJoin: () => void;
  canResume: boolean;
  onResume: () => void;
};

export function HomeScreen({ onCreate, onJoin, canResume, onResume }: Props) {
  return (
    <section className="screen active" id="home">
      <div className="hero-copy">
        <span className="eyebrow">입장 코드로 함께 고르기</span>
        <h1>
          각자 골라도,
          <br />
          <em>결론은 함께.</em>
        </h1>
        <p>
          위치를 고르고 방을 만든 뒤 코드를 공유하세요.
          <br />
          모두 끝나면 메뉴 TOP 3와 주변 음식점 5곳이 나와요.
        </p>
        <div className="home-actions">
          <button className="primary" type="button" onClick={onCreate}>
            방 만들기 <span>→</span>
          </button>
          <button className="secondary" type="button" onClick={onJoin}>
            코드로 입장
          </button>
        </div>
        {canResume ? (
          <button className="text-btn" type="button" onClick={onResume}>
            진행 중인 방 이어하기
          </button>
        ) : null}
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="plate">
          <span className="food f1">🍜</span>
          <span className="food f2">🍕</span>
          <span className="food f3">🥘</span>
          <span className="food f4">🍣</span>
          <span className="food f5">🥗</span>
          <div className="center-dot">?</div>
        </div>
        <span className="spark s1">✦</span>
        <span className="spark s2">✦</span>
      </div>
      <div className="how-card">
        <strong>이렇게 골라요</strong>
        <div>
          <b>1</b>
          <span>
            코드로
            <br />
            입장
          </span>
        </div>
        <i />
        <div>
          <b>2</b>
          <span>
            각자
            <br />
            응답
          </span>
        </div>
        <i />
        <div>
          <b>3</b>
          <span>
            TOP 3
            <br />
            확인
          </span>
        </div>
      </div>
    </section>
  );
}
