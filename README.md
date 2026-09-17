# Pocket Mates (`pocket-mates`)

소비 내역에 따라 캐릭터의 표정과 생활 공간이 달라지는 게임형 가계부 미니앱입니다.

앱인토스 `appName`: **pocket-mates**

## 실행

```bash
npm install
npm install --prefix web
npm test
npm run dev
```

로컬에서는 AIT Devtools로 토스 로그인 등을 모킹할 수 있습니다.

## 앱인토스 빌드·배포

```bash
npm run build   # web 빌드 + ait build → pocket-mates.ait
npm run deploy  # 콘솔 API 키 필요: npx ait deploy --api-key ...
```

로그인: **토스 로그인** (`TossAuth.login`).  
AccessToken 교환은 파트너 서버 mTLS가 필요하며, 현재는 로그인 성공 세션만 클라이언트에 유지합니다.

Supabase는 DB 동기화용으로 남겨 두었고, Supabase Auth(매직링크)는 사용하지 않습니다.  
테이블/RLS: `supabase/schema.sql`

## 프로젝트 문서

- 디자인 파일 위치와 추가 규칙: `docs/ASSETS.md`
- 최초 기획 대비 변경 내역과 버전별 기록: `docs/PATCH_NOTES.md`
