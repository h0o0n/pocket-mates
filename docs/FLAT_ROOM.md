# 평면 방 아트 가이드

## 기준

정면 1000×650 좌표계. 벽과 바닥은 단색, 창문은 독립된 하늘 레이어입니다. 강아지는 승인된 찹쌀떡 실루엣을 유지하며 방과 가구는 간단한 SVG로 관리합니다.

- `web/src/room/catalog.ts`: 24개 소품의 가격·슬롯·구역·배치 사각형, 방별 기본 구성, 이전 보유품 마이그레이션.
- `web/src/room/FlatArt.tsx`: 가구 24종, 음식 4종, 택배 1종. 120×100 원본 좌표와 공통 갈색 외곽선.
- `web/src/room/FlatRoom.tsx`: 빈 방, 창밖, 소품, 강아지, 소비 흔적, 낡음의 합성.
- `web/src/room/flat-room.css`: 색 테마 3종과 호흡·눈 깜빡임·구름·조명. 움직임 줄이기 설정 지원.
- `web/public/assets/flat/mochi-dog.png`: 투명 강아지 원화. 내장 이미지 생성 도구로 승인된 시안에서 분리 제작.

소품 수정 후 `node scripts/export-flat-art.mjs`를 실행하면 정적 SVG 29개를 내보냅니다. 코드가 원본이며 PNG 스프라이트 좌표는 사용하지 않습니다.

## 배치 규칙

한 슬롯에는 한 소품만 배치합니다. TV·게임기는 TV장, 탁상 소품은 협탁이 필요하며 배치 시 기본 받침도 함께 놓입니다. 받침을 치우면 위 소품도 보관됩니다. 방마다 별도 배치를 저장하며, 빈 슬롯을 기본 가구로 자동 채우지 않습니다. 기존 소품 ID와 구매 내역을 유지합니다.

## 소비와 시간

`DogReaction.tsx`는 기존 강아지 PNG 위에 반응을 겹칩니다. 식비에 따른 배 모양, 이번 달 쇼핑 3건 이상의 선글라스, 잔액 50% 이하의 영수증은 함께 표시할 수 있습니다. 잔액 25% 이하에서는 영수증이 길어지고 확인하는 동작이 빨라집니다. 선글라스가 없을 때는 눈치 주는 눈매도 표시하며, 잔액 10% 이하에서는 땀방울을 추가합니다. 기록을 삭제하거나 예산이 바뀌면 현재 값으로 즉시 재계산합니다.

현재 달 식비 기록 3건마다 음식 1개, 쇼핑 3건마다 택배 1개가 생기며 각각 최대 4개입니다. 음식 종류는 기록 ID로 안정적으로 선택해 새로고침 때 바뀌지 않습니다. 식비 비율 10%·20%에서 강아지가 조금씩 통통해집니다.

생활예산 잔액 50% 이하에서 얼룩, 25% 이하에서 벽지 들뜸·소파 패치, 10% 이하에서 테이프가 추가됩니다. 잔액 회복 시 원상태로 돌아옵니다.

자동 시간은 기기 현지 시각으로 07~17시 낮, 17~20시 노을, 나머지는 밤이며 1분마다 갱신됩니다. 하늘과 해·달·별은 창문 내부에서 바뀌고 조명은 배치한 조명 소품이 있을 때만 켜집니다.

## 자산 정리와 검증

과거 방·가구 스프라이트·음식·택배·강아지 PNG는 사용 중인 참조를 교체한 후 배포 자산에서 제거했습니다. 작업 당시 수정본까지 `output/flat-room/legacy-assets-before-flat.zip`에 로컬 백업했습니다. 이 폴더는 Git과 배포에서 제외됩니다.

브라우저 검증: PC 낮/밤, 모바일 390px, 소품 구매 후 상점 숨김, 보관 후 새로고침 유지, 8개 소비 흔적 상한, 낡음, 강아지 대화. 스크린샷은 `output/flat-room/`에 저장합니다.

## 캐릭터 생성 프롬프트

내장 이미지 생성 도구 사용. 승인된 평면 시안의 강아지만 참고:

> Extract and faithfully recreate ONLY the approved mochi puppy from the latest flat front-view room concept. Single cream/apricot flattened bean-shaped puppy with very short floppy ears, tiny wide spaced dot eyes, little oval brown nose, no mouth, two almost invisible paw bumps. Preserve its extremely simple humble deadpan adorable identity. Warm dark brown slightly irregular thick outline, flat pale cream fill, minimal soft shading. Full body, straight-on view, centered and filling 85% of canvas width, ample transparent margins. Genuine transparent background, no rug, no shadow, no furniture, no room, no text. Output a landscape 3:2 standalone character asset suitable for subtle breathing animation in a web app.

Supabase 스키마 파일도 새 SVG 경로와 room_layouts 필드를 반영했습니다. 현재 UI 저장은 기존과 동일하게 브라우저 localStorage이며, 이번 작업에서 원격 DB에 쿼리를 실행하지 않았습니다.
