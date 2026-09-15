# Wallet Mates

소비 내역에 따라 캐릭터의 표정과 생활 공간이 달라지는 게임형 가계부입니다.

현재는 UI보다 핵심 도메인 로직을 먼저 개발하고 있습니다.

## 준비된 로직

- 월급, 고정지출, 저축 목표를 이용한 사용 가능 예산 계산
- 소비 합계, 남은 잔액, 초과 지출 계산
- 잔액 비율에 따른 캐릭터 상태 판정
- 소비 카테고리와 반복 횟수에 따른 반응 문구
- 입력값 검증

## 실행

```bash
npm install --prefix web
npm test
npm run dev
```

## 배포 빌드

```bash
npm run build
```

Vercel은 루트의 `vercel.json` 설정을 사용합니다.

Supabase 테이블과 RLS 정책은 `supabase/schema.sql`에 있습니다.
