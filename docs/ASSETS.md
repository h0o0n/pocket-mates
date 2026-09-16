# 디자인 자산 관리 규칙

디자인 파일은 **어디에서 쓰는지**를 기준으로 나눕니다. 새 파일도 아래 구조에 맞춰 추가합니다.

## 앱에서 사용하는 자산

앱에 직접 노출되는 파일은 `web/public/assets`에 둡니다.

```text
web/public/assets/
├─ characters/
│  └─ states/          # v0.6 PNG 상태 캐릭터 (neutral / chubby / very-chubby / receipt)
├─ rooms/
│  ├─ budget-states/   # 잔액 단계에 따라 변하는 기본 다락방
│  └─ skins/           # 사용자가 구매·장착하는 별도 방 스킨
├─ props/
│  ├─ food/            # 식비·배달 횟수로 쌓이는 소품
│  └─ shopping/        # 쇼핑 횟수로 쌓이는 소품
└─ ui/                 # 파비콘, 공통 아이콘 등 화면 요소
```

강아지는 `characters/states/dog-*.png`만 사용합니다. `flat/mochi-dog.png`와 `web/src/room/FlatRoom`은 현재 런타임에서 쓰지 않습니다.

파일명은 `대상-상태.png` 형식을 권장합니다. 같은 자산의 수정본을 교체할 때는 파일명에 `final`, `최종`, 날짜를 붙이지 않고 Git 이력으로 관리합니다.

## 블로그 제작용 자산

앱 빌드에 포함되지 않는 블로그 이미지는 `images/blog`에 둡니다.

```text
images/blog/
├─ branding/           # 블로그 홈·브랜드 이미지
├─ guides/             # 서비스 사용법 캡처
│  └─ chatgpt/
└─ posts/              # 게시물 주제별 이미지
   ├─ gta6/
   ├─ ps5/
   ├─ nintendo-switch/
   └─ tarae/
```

새 글을 만들 때는 `posts/<주제>/`를 먼저 만들고 원본, 편집본, 썸네일을 함께 보관합니다. 생성 프롬프트와 글 초안은 이미지 폴더가 아닌 `drafts`에 둡니다.

## 코드에서 사용하는 경로

`web/public`이 웹 루트이므로 앱 코드에서는 `/assets/...`로 참조합니다. 파일을 옮기면 `web/src`의 경로도 함께 수정하고 반드시 빌드를 확인합니다.
# 빈 방 및 가구 소품

- `rooms/empty-attic-night.png`: 고정 가구가 없는 밤의 다락방
- `rooms/empty-cloud-sunset.png`: 고정 가구가 없는 구름 노을방
- `rooms/empty-game-night.png`: 고정 가구가 없는 게임방 구조
- `decorations/furniture-sprite.png`: 침대, 책장, 러그, 소파, TV장, 협탁, 벽 선반, 화분 4×2 스프라이트
- `decorations/room-items-sprite.png`: 상점 소품 4×4 스프라이트

## 창밖 시간대 레이어 (Lofi)

방 전체 톤 필터만으로는 창밖이 바뀌는 느낌이 약해서, **창문 사각형 위에 sky 레이어**를 얹습니다.

```text
web/public/assets/rooms/windows/
├─ sky-day.png      # 맑은 낮 하늘 / 먼 건물 실루엣
├─ sky-sunset.png   # 노을·보라-주황 그라데이션
└─ sky-night.png    # 밤하늘·희미한 도시 불빛
```

### 제작 규칙

1. 캔버스 **16:9**, 해상도 권장 1280×720 이상
2. **창문 유리 영역만** 그리거나, 전체 하늘 텍스처로 두고 앱이 `windowFrames`로 크롭
3. 방 이미지와 **같은 카메라 높이·소실점**을 유지
4. 이상적으로는 빈 방 PNG의 창문을 **어두운 단색/투명에 가깝게** 다시 뽑아, sky가 자연스럽게 비치게 함
5. 파일이 없어도 CSS 그라데이션 폴백이 동작함

앱의 창문 좌표는 `web/src/App.tsx`의 `windowFrames`입니다. 스킨마다 창 위치가 다르면 여기 %만 조정합니다.

## 소품이 방과 안 어울릴 때 (크기·각도)

### 원인

1. 방은 **투시(원근)** 그림인데, 소품은 **정면 컷아웃**으로 따로 생성됨
2. CSS가 소품 칸을 `aspect-ratio: 1` 정사각으로 강제해 침대·러그가 찌그러짐
3. 모든 소품이 같은 스케일이라 **앞쪽/뒤쪽 깊이감**이 없음
4. 조명·선 굵기·채도가 방 원본과 다름

### 해결 순서 (효과가 큰 순)

1. **에셋 재생성 (근본)**
   - 프롬프트에 방과 동일 조건 명시: `same perspective as attic room, front-facing eye-level view, warm pencil/watercolor, matching line weight`
   - 가능하면 **방 스킨별로 소품 시트**를 분리
2. **코드 자동 보정 (현재 반영)**
   - 방 이미지를 기준으로 `windowFrames`·`roomPlacements`·슬롯 크기를 정면 시점에 맞게 재조정
   - 스프라이트 칸은 정사각 유지(찌그러짐 방지), 시간대별 소품 조명 필터 적용
   - 억지 `rotate/skew`는 제거 (방이 정면인데 기울이면 더 어색해짐)
3. **기본 가구 bake (장기)**
   - 자주 쓰는 침대/러그는 방 이미지에 포함하고, 상점은 악세서리 위주

### 이미지 AI 프롬프트 템플릿

```text
Isometric-ish cozy attic interior prop, isolated on transparent background,
matching the perspective of a hand-drawn Korean webtoon room (slight downward angle),
warm muted palette, soft shading, no harsh drop shadow, game asset sprite
```

방 사진 한 장을 레퍼런스로 넣고 “match this room's camera angle and line weight”를 반드시 같이 넣습니다.
# 현재 자산 (평면 방 v2)

현재 앱은 `web/src/room/FlatArt.tsx`의 SVG 소품과 `web/public/assets/flat/`만 사용합니다. 아래의 과거 PNG 목록은 이전 버전 기록이며, 폐기 자산은 로컬 `output/flat-room/legacy-assets-before-flat.zip`에 백업했습니다. 상세 관리 방법은 `FLAT_ROOM.md`를 참고하세요.
