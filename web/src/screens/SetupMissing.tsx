export function SetupMissing() {
  return (
    <section className="screen active">
      <div className="panel compact">
        <span className="step">설정 필요</span>
        <h2>Supabase 연결이 필요해요</h2>
        <p className="sub">
          `web/.env` 파일에 아래 값을 넣고, Supabase SQL Editor에서
          `supabase/schema.sql`을 실행해 주세요.
        </p>
        <pre className="env-box">{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}</pre>
      </div>
    </section>
  );
}
