import { useMemo, useState } from "react";
import { useRoomSync } from "./hooks/useRoomSync";
import {
  clearSession,
  loadSession,
  type LocalSession,
} from "./lib/session";
import {
  createRoom,
  joinRoom,
  startAnswering,
  submitAnswers,
} from "./lib/roomApi";
import type { AnswerMap } from "./lib/scoring";
import { isSupabaseConfigured } from "./lib/supabase";
import { EntryScreen } from "./screens/EntryScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { QuestionsScreen } from "./screens/QuestionsScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { SetupMissing } from "./screens/SetupMissing";
import { WaitingScreen } from "./screens/WaitingScreen";

type View = "home" | "create" | "join" | "room";

const todayLabel = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(new Date());

export default function App() {
  const saved = loadSession();
  const [view, setView] = useState<View>(saved ? "room" : "home");
  const [session, setSession] = useState<LocalSession | null>(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { room, participants, answers, loading, error: syncError } = useRoomSync(session?.roomId ?? null);

  const me = useMemo(
    () => participants.find((person) => person.id === session?.participantId) ?? null,
    [participants, session?.participantId],
  );

  const myIndex = Math.max(
    0,
    participants.findIndex((person) => person.id === session?.participantId),
  );

  const answerList = useMemo(() => {
    // 완료한 참가자 순서대로 답변을 모아 점수 계산에 사용합니다.
    return participants
      .filter((person) => person.is_done)
      .map((person) => answers.find((row) => row.participant_id === person.id)?.payload)
      .filter((payload): payload is AnswerMap => Boolean(payload));
  }, [participants, answers]);

  const allDone = participants.length > 0 && participants.every((person) => person.is_done);

  function resetToHome() {
    clearSession();
    setSession(null);
    setError(null);
    setView("home");
  }

  async function handleCreate(values: { nickname: string }) {
    setBusy(true);
    setError(null);
    try {
      const next = await createRoom(values.nickname);
      setSession(next);
      setView("room");
    } catch (err) {
      setError(err instanceof Error ? err.message : "방을 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(values: { nickname: string; code?: string }) {
    setBusy(true);
    setError(null);
    try {
      const next = await joinRoom(values.code || "", values.nickname);
      setSession(next);
      setView("room");
    } catch (err) {
      setError(err instanceof Error ? err.message : "입장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await startAnswering(session.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "시작하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(payload: AnswerMap) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await submitAnswers(session.roomId, session.participantId, payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="shell">
        <Header onHome={resetToHome} />
        <SetupMissing />
      </main>
    );
  }

  let content = (
    <HomeScreen
      onCreate={() => {
        setError(null);
        setView("create");
      }}
      onJoin={() => {
        setError(null);
        setView("join");
      }}
      canResume={Boolean(saved)}
      onResume={() => {
        setSession(loadSession());
        setView("room");
      }}
    />
  );

  if (view === "create") {
    content = (
      <EntryScreen
        mode="create"
        busy={busy}
        error={error}
        onBack={() => setView("home")}
        onSubmit={handleCreate}
      />
    );
  } else if (view === "join") {
    content = (
      <EntryScreen
        mode="join"
        busy={busy}
        error={error}
        onBack={() => setView("home")}
        onSubmit={handleJoin}
      />
    );
  } else if (view === "room" && session) {
    if (loading && !room) {
      content = (
        <section className="screen active">
          <div className="panel compact">
            <h2>방 불러오는 중...</h2>
            <p className="sub">잠시만 기다려 주세요.</p>
          </div>
        </section>
      );
    } else if (syncError && !room) {
      content = (
        <section className="screen active">
          <div className="panel compact">
            <h2>방을 찾지 못했어요</h2>
            <p className="sub">{syncError}</p>
            <button className="primary full" type="button" onClick={resetToHome}>
              홈으로
            </button>
          </div>
        </section>
      );
    } else if (room?.status === "waiting") {
      content = (
        <LobbyScreen
          roomCode={session.roomCode}
          participants={participants}
          meId={session.participantId}
          busy={busy}
          error={error}
          onStart={handleStart}
          onLeave={resetToHome}
        />
      );
    } else if ((room?.status === "answering" || room?.status === "completed") && me && !me.is_done) {
      content = (
        <QuestionsScreen
          nickname={session.nickname}
          colorIndex={myIndex}
          busy={busy}
          error={error}
          onSubmit={handleSubmit}
        />
      );
    } else if (me?.is_done && !allDone) {
      content = <WaitingScreen participants={participants} meId={session.participantId} />;
    } else if (allDone && answerList.length > 0) {
      content = (
        <ResultsScreen
          nicknames={participants.map((person) => person.nickname)}
          answerList={answerList}
          onRestart={resetToHome}
        />
      );
    } else {
      content = (
        <section className="screen active">
          <div className="panel compact">
            <h2>상태를 확인하는 중...</h2>
            <p className="sub">Realtime 동기화를 기다리는 중이에요.</p>
          </div>
        </section>
      );
    }
  }

  return (
    <main className="shell">
      <Header onHome={resetToHome} />
      {content}
    </main>
  );
}

function Header({ onHome }: { onHome: () => void }) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={onHome} aria-label="처음으로">
        <span className="brand-mark">냠</span>
        <span>오늘 뭐 먹지?</span>
      </button>
      <div className="today">{todayLabel}</div>
    </header>
  );
}
