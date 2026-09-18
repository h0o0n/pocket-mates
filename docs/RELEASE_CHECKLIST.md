# 앱인토스 출시 체크리스트 (눈찌 / pocket-mates)

코드로 맞춘 항목과, **콘솔에서 직접 확인해야 하는 항목**을 나눈 목록입니다.  
기준: [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame), [미니앱 출시하기](https://developers-apps-in-toss.toss.im/guide/operation/deploy)

> **앱 유형: 비게임** — `User.getAnonymousKey` 사용. 콘솔에서 게임으로 등록하지 마세요.  
> 캐릭터·미션·냠은 가계부 UX 요소이며, 소개 문구에 “게임형/게임”을 쓰지 마세요.

## 코드/번들에서 완료된 항목

- [x] SDK 3.x + `apps-in-toss.config.ts` (`appName: pocket-mates`, `primaryColor: #3182F6`)
- [x] TDS Mobile + `TDSMobileAITProvider`
- [x] 플로팅 탭바 2~5개 (홈/예산/내역/꾸미기)
- [x] 진입 직후 강제 바텀시트/설문 없음 (설문은 꾸미기에서 선택·닫기 가능)
- [x] 자체 Top/뒤로가기 미사용 → 토스 내비와 중복 없음
- [x] CSR만 사용, `eval`/외부 iframe 없음
- [x] 기기 권한 요청 없음 (`permissions: []`)
- [x] 핀치 줌 차단 (`user-scalable=no` + gesture 차단)
- [x] `User.getAnonymousKey` 발급 + `pocket:u:{hash}:*` 저장 + 레거시 마이그레이션
- [x] 제품 문구 해요체 · “게임형” 표현 제거 (비게임 소개와 일치)
- [x] 미완성 토스 로그인 UI 제거
- [x] 꾸미기 리워드 광고 (`userEarnedReward`만 지급 + dismissed 누락 폴백)
- [x] 홈·꾸미기 배너 (꾸미기는 리워드 loaded 후 순차 마운트)
- [x] 브랜드 로고 원본: `web/public/assets/ui/app-icon-600.png` (600×600, 불투명)

## 콘솔에서 직접 해야 하는 항목

### 앱 정보 (권장 문구)

| 항목 | 권장 값 |
|------|---------|
| 앱 유형 | **비게임** |
| 앱 이름(국문) | **눈찌** |
| appName | `pocket-mates` (코드와 동일) |
| 부제 | 소비 기록에 반응하는 가계부 |
| 상세 설명 | 예산을 정하고 소비를 기록하면, 눈찌와 방이 함께 바뀌는 가계부예요. 미션과 꾸미기로 기록을 이어갈 수 있어요. |
| 카테고리 | 금융·라이프(콘솔 옵션 중 가계부/생활 관리에 가까운 항목) |
| 앱 내 기능 | 예산·소비 기록·미션·방/눈찌 꾸미기 (실제 화면과 동일하게) |
| 브랜드 로고 | `app-icon-600.png` 업로드 — **600×600 PNG, 각진 정사각, 투명·둥근 모서리 없음** |

### 광고·도메인

- [ ] 리워드 광고 그룹 실 ID → `VITE_REWARDED_AD_GROUP_ID` (개발: `ait-ad-test-rewarded-id`)
- [ ] 배너 광고 그룹 실 ID → `VITE_BANNER_AD_GROUP_ID` (개발: `ait-ad-test-banner-id`)
- [ ] CORS/Origin에 앱 도메인 허용  
  - 실서비스: `https://pocket-mates.web.tossmini.com`  
  - QR: `https://pocket-mates.private-web.tossmini.com`
- [ ] `.ait` 업로드 후 QR 테스트 → **검토 요청**

## 토스앱에서 수동 확인

- [ ] 미니앱 정상 오픈, 종료 후 재접속 시 예산·내역·냠 유지
- [ ] 핀치 줌 불가
- [ ] 내비 더보기(⋯) 신고/공유, 닫기(X) 동작
- [ ] 최초 화면에서 뒤로가기/닫기 시 미니앱 종료
- [ ] 안드로이드 시스템 백버튼 동작
- [ ] 리워드: 시청 완료 시 냠 지급, 닫은 뒤 버튼이 다시 눌림
- [ ] 라이트 모드·스크롤 지연 없음

## 나중에 토스 로그인을 켤 때

1. 콘솔에서 약관·동의 항목·연결 끊기 콜백 등록  
2. 파트너 서버 mTLS로 AccessToken / userKey 교환  
3. 연결 끊기 시 로컬·서버 데이터 삭제 + 재로그인 안내  
4. 진입 직후 로그인 바텀시트 자동 노출 금지
