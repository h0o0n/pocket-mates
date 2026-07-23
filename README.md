# SelectFood

입장 코드로 여러 명이 접속해, 각자 속도로 취향 질문에 답한 뒤 공통 메뉴 TOP 3를 추천하는 웹앱입니다.

- 프론트: React + Vite (`web/`)
- 실시간/저장: Supabase (로그인 없음, 입장 코드만 사용)
- 배포: Vercel

## 1) Supabase 준비

1. [Supabase](https://supabase.com)에서 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
3. Project Settings → API에서 URL과 anon key를 복사합니다.
4. `web/.env` 파일을 만듭니다.

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_KAKAO_MAP_APP_KEY=your-kakao-javascript-key
```

카카오 Developers에서 JavaScript 키를 발급하고, Web 플랫폼에 `http://localhost:5173` 및 배포 도메인을 등록하세요.

## 2) 로컬 실행

```powershell
cd web
npm install
npm run dev
```

## 3) 이용 흐름

1. 한 명이 **방 만들기** → 지도에서 만날 위치 선택 → 6자리 입장 코드 공유
2. 나머지는 **코드로 입장** (같은 코드면 같은 방)
3. 2명 이상 모이면 **질문 시작**
4. 각자 속도로 답변 제출
5. 먼저 끝난 사람은 대기 화면에서 다른 사람을 기다림
6. 모두 완료되면 메뉴 TOP 3 + 주변 음식점 5곳 표시

## 4) Vercel 배포

1. GitHub에 푸시합니다.
2. Vercel 프로젝트 생성 후 Root Directory는 저장소 루트(또는 `web`)로 둡니다.
3. Framework Preset은 Vite / Other, Override는 끕니다.
4. Environment Variables에 아래를 추가합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_KAKAO_MAP_APP_KEY`

`vercel.json`은 `web` 앱을 빌드해 `web/dist`를 배포합니다.
