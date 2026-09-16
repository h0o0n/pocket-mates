# 디자인 자산 관리 규칙

디자인 파일은 **어디에서 쓰는지**를 기준으로 나눕니다. 새 파일도 아래 구조에 맞춰 추가합니다.

## 앱에서 사용하는 자산

앱에 직접 노출되는 파일은 `web/public/assets`에 둡니다.

```text
web/public/assets/
├─ characters/
│  └─ states/          # 소비 상태·체형에 따라 바뀌는 캐릭터
├─ rooms/
│  ├─ budget-states/   # 잔액 단계에 따라 변하는 기본 다락방
│  └─ skins/           # 사용자가 구매·장착하는 별도 방 스킨
├─ props/
│  ├─ food/            # 식비·배달 횟수로 쌓이는 소품
│  └─ shopping/        # 쇼핑 횟수로 쌓이는 소품
├─ decorations/        # 사용자가 구매해 방에 배치하는 꾸미기 소품
└─ ui/                 # 파비콘, 공통 아이콘 등 화면 요소
```

`decorations/room-items-sprite.png`는 4×4 소품 시트입니다. 소품 순서와 좌표는 `web/src/App.tsx`의 `decorations` 목록 및 Supabase `shop_items` 데이터가 함께 관리합니다.

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
