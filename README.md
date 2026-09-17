# Pocket Mates (`pocket-mates`) — 눈찌

소비 내역에 따라 캐릭터의 표정과 생활 공간이 달라지는 게임형 가계부 미니앱입니다.

앱인토스 `appName`: **pocket-mates**

## 실행

```bash
npm install
npm install --prefix web
npm test
npm run dev
```

로컬에서는 AIT Devtools로 토스 환경을 모킹할 수 있습니다.

## 사용자 식별

토스 로그인 없이 `User.getAnonymousKey`로 사용자를 구분합니다.  
가계부 데이터는 `pocket:u:{hash}:*` 키로 저장되며, 예전 `pocket-*` 키는 최초 1회 자동 마이그레이션됩니다.

토스 로그인은 파트너 서버(mTLS)·약관·연결 끊기 콜백이 준비된 뒤에 다시 연동하세요.  
지금은 식별키만으로 재접속 데이터 유지를 맞춥니다.

## 앱인토스 빌드·배포

```bash
npm run build   # web 빌드 + ait build → pocket-mates.ait
npm run deploy  # 콘솔 API 키 필요: npx ait deploy --api-key ...
```

출시 전 콘솔·검수 항목은 `docs/RELEASE_CHECKLIST.md`를 확인하세요.

## 프로젝트 문서

- 출시 체크리스트: `docs/RELEASE_CHECKLIST.md`
- 디자인 파일 위치와 추가 규칙: `docs/ASSETS.md`
- 최초 기획 대비 변경 내역과 버전별 기록: `docs/PATCH_NOTES.md`
- Supabase 테이블/RLS(선택 동기화): `supabase/schema.sql`
