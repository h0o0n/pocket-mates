import { useMemo, useState } from "react";
import { AVATAR_COLORS, QUESTIONS } from "../data/questions";
import type { AnswerMap } from "../lib/scoring";

type Props = {
  nickname: string;
  colorIndex: number;
  busy: boolean;
  error: string | null;
  onSubmit: (answers: AnswerMap) => Promise<void>;
};

export function QuestionsScreen({ nickname, colorIndex, busy, error, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const question = QUESTIONS[step];
  const selected = answers[question.key] || [];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const canNext = selected.length > 0;

  const avatarStyle = useMemo(
    () => ({ background: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length] }),
    [colorIndex],
  );

  function selectOption(value: string) {
    setAnswers((prev) => {
      const current = prev[question.key] || [];
      let next = current;

      if (question.multi) {
        if (value === "none") {
          next = ["none"];
        } else {
          next = current.filter((item) => item !== "none");
          next = next.includes(value) ? next.filter((item) => item !== value) : [...next, value];
          if (question.max && next.length > question.max) next = next.slice(1);
        }
      } else {
        next = [value];
      }

      return { ...prev, [question.key]: next };
    });
  }

  async function goNext() {
    if (step < QUESTIONS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    await onSubmit(answers);
  }

  function goBack() {
    if (step > 0) setStep((value) => value - 1);
  }

  function skip() {
    setAnswers((prev) => ({ ...prev, [question.key]: [] }));
    if (step < QUESTIONS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    void onSubmit({ ...answers, [question.key]: [] });
  }

  return (
    <section className="screen active">
      <div className="panel question-panel">
        <div className="question-head">
          <button className="back" type="button" onClick={goBack} disabled={step === 0 || busy}>
            ← 이전
          </button>
          <div className="progress-wrap">
            <div className="progress" style={{ width: `${progress}%` }} />
          </div>
          <span>
            {step + 1} / {QUESTIONS.length}
          </span>
        </div>

        <div className="answering">
          <span style={avatarStyle}>{nickname[0]}</span>
          <b>{nickname}</b> 님의 응답
        </div>

        <div>
          <h2 className="question-title">{question.title}</h2>
          <p className="question-hint">{question.hint}</p>
          <div className={`options ${question.multi ? "multi" : ""}`}>
            {question.options.map(([value, emoji, label]) => (
              <button
                key={value}
                type="button"
                className={`option ${selected.includes(value) ? "selected" : ""}`}
                onClick={() => selectOption(value)}
                disabled={busy}
              >
                <span className="emoji">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="question-actions">
          <button className="secondary" type="button" onClick={skip} disabled={busy}>
            잘 모르겠어요
          </button>
          <button className="primary" type="button" disabled={!canNext || busy} onClick={() => void goNext()}>
            {busy ? "제출 중..." : step === QUESTIONS.length - 1 ? "제출하고 기다리기" : "다음"}
            {!busy ? <span>→</span> : null}
          </button>
        </div>
      </div>
    </section>
  );
}
