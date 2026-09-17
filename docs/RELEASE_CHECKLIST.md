# 앱인토스 출시 체크리스트 (눈찌 / pocket-mates)

코드로 맞춘 항목과, **콘솔에서 직접 확인해야 하는 항목**을 나눈 목록입니다.  
기준: [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame), [미니앱 출시하기](https://developers-apps-in-toss.toss.im/guide/operation/deploy)

## 코드/번들에서 완료된 항목

- [x] SDK 3.x + `apps-in-toss.config.ts` (`appName: pocket-mates`, `primaryColor: #3182F6`)
- [x] TDS Mobile + `TDSMobileAITProvider`
- [x] 플로팅 탭바 2~5개 (홈/예산/내역/꾸미기)
- [x] 진입 직후 바텀시트 자동 노출 없음 (FAB로만 열림)
- [x] 자체 Top/뒤로가기 미사용 → 토스 내비와 중복 없음
- [x] CSR만 사용, `eval`/외부 iframe 없음
- [x] 기기 권한 요청 없음 (`permissions: []`)
- [x] 인앱결제·광고·토스페이 미사용
- [x] `User.getAnonymousKey` 발급 + `pocket:u:{hash}:*` 저장 + 레거시 마이그레이션
- [x] 제품 문구 해요체 정리·과도한 죄책감 표현 완화
- [x] 미완성 토스 로그인 UI 제거 (로그인 재연동 시 서버·약관·콜백 필수)
- [x] 꾸미기 탭 상단 리워드 광고 (`userEarnedReward` → 100냠)
- [x] 홈·꾸미기 리스트형 배너 (미션 아래 / 목록 아래, 화면당 1개)

## 콘솔에서 직접 해야 하는 항목

- [ ] 앱 이름(국문) = 서비스명(눈찌 등)과 일치
- [ ] 브랜드 로고: **600×600px PNG**, 각진 정사각형, 투명/둥근 모서리 금지
- [ ] 부제·상세 설명·사용 연령·고객문의 이메일
- [ ] 카테고리·‘앱 내 기능’ 소개와 실제 기능 일치
- [ ] (해당 시) 약관 URL이 로그인/동의 화면에 정상 노출
- [ ] `.ait` 업로드 (압축 해제 기준 100MB 이하) — 현재 번들은 약 32MB대
- [ ] QR 테스트 1회 이상 완료 후 **검토 요청**
- [ ] 리워드 광고 그룹 생성 후 `VITE_REWARDED_AD_GROUP_ID`에 실 ID 설정 (개발은 `ait-ad-test-rewarded-id`)
- [ ] 배너 광고 그룹 생성 후 `VITE_BANNER_AD_GROUP_ID`에 실 ID 설정 (개발은 `ait-ad-test-banner-id`)
- [ ] 테스트 환경 CORS/Origin에 앱 도메인 허용  
  - 실서비스: `https://pocket-mates.web.tossmini.com`  
  - QR: `https://pocket-mates.private-web.tossmini.com`

## 토스앱에서 수동 확인

- [ ] 미니앱 정상 오픈, 종료 후 재접속 시 예산·내역·냠 유지
- [ ] 내비 더보기(⋯) 신고/공유, 닫기(X) 동작
- [ ] 최초 화면에서 뒤로가기/닫기 시 미니앱 종료
- [ ] 안드로이드 시스템 백버튼 동작
- [ ] 스크롤·터치 반응 지연 없음, 라이트 모드

## 나중에 토스 로그인을 켤 때

1. 콘솔에서 약관·동의 항목·연결 끊기 콜백 등록  
2. 파트너 서버 mTLS로 AccessToken / userKey 교환  
3. 연결 끊기 시 로컬·서버 데이터 삭제 + 재로그인 안내  
4. 진입 직후 로그인 바텀시트 자동 노출 금지
