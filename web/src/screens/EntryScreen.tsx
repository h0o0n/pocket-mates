import { useState, type FormEvent } from "react";

type Mode = "create" | "join";

type Props = {
  mode: Mode;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (values: { nickname: string; code?: string }) => Promise<void>;
};

export function EntryScreen({ mode, busy, error, onBack, onSubmit }: Props) {
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      nickname: nickname.trim(),
      code: mode === "join" ? code.trim().toUpperCase() : undefined,
    });
  }

  return (
    <section className="screen active">
      <div className="panel compact">
        <button className="back" type="button" onClick={onBack}>
          ← 돌아가기
        </button>
        <span className="step">{mode === "create" ? "방 만들기" : "코드로 입장"}</span>
        <h2>{mode === "create" ? "먼저 닉네임을 정해요" : "입장 코드를 입력해요"}</h2>
        <p className="sub">
          {mode === "create"
            ? "닉네임을 정한 뒤, 지도에서 만날 위치를 고르면 6자리 코드가 생겨요."
            : "같은 코드를 입력한 사람들끼리 한 방으로 모입니다."}
        </p>
        <form className="entry-form" onSubmit={handleSubmit}>
          {mode === "join" ? (
            <label>
              입장 코드
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="예: AB12CD"
                autoComplete="off"
                required
              />
            </label>
          ) : null}
          <label>
            닉네임
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={8}
              placeholder="이름 또는 별명"
              autoComplete="off"
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary full" type="submit" disabled={busy}>
            {busy ? "연결 중..." : mode === "create" ? "방 만들고 입장" : "입장하기"}
            {!busy ? <span>→</span> : null}
          </button>
        </form>
      </div>
    </section>
  );
}
