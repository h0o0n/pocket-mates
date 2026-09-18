# 디자인 자산 관리 규칙

디자인 파일은 **어디에서 쓰는지**를 기준으로 나눕니다. 새 파일도 아래 구조에 맞춰 추가합니다.

## 앱에서 사용하는 자산

앱에 직접 노출되는 파일은 `web/public/assets`에 둡니다.

```text
web/public/assets/
├─ branding/           # 앱 아이콘 등
├─ characters/
│  ├─ guide.md         # 옷(코스튬) 추가 시 필수 상태·모션 규칙 (반드시 참고)
│  ├─ outfits/         # 옷별 idle/상점 썸네일
│  └─ states/          # 상태 PNG (neutral / chubby / very-chubby / receipt / eating + 옷 접미사)
├─ rooms/
│  ├─ budget-states/   # 잔액 단계에 따라 변하는 기본 다락방
│  └─ skins/           # 사용자가 구매·장착하는 별도 방 스킨
├─ props/
│  ├─ food/            # 식비·배달 횟수로 쌓이는 소품
│  └─ shopping/        # 쇼핑 횟수로 쌓이는 소품
└─ ui/                 # 파비콘, 공통 아이콘 등 화면 요소
```

강아지(눈찌) 상태·옷 에셋 규칙은 **`web/public/assets/characters/guide.md`** 를 따릅니다.  
새 옷을 만들 때는 맨몸과 동일한 5상태(`neutral` / `chubby` / `very-chubby` / `receipt` / `eating`)를 **전부** 만들고, **테두리·얼굴·실루엣은 원본 캐릭터를 고정**한 채 옷만 입힙니다. hop·nod·walk는 CSS 공용이라 PNG를 추가하지 않습니다.

파일명은 `dog-{상태}.png` / `dog-{상태}-{outfitId}.png` 형식을 권장합니다. 같은 자산의 수정본을 교체할 때는 파일명에 `final`, `최종`, 날짜를 붙이지 않고 Git 이력으로 관리합니다.

## 블로그 제작용 자산

앱 저장소와 분리해 워크스페이스 루트의 **`blog/`** 에 둡니다.  
경로: `Desktop/SelectFood/blog/` (앱 폴더 `SelectFood/SelectFood`의 형제)

```text
blog/
├─ branding/           # 블로그 홈·브랜드 이미지
├─ guides/             # 서비스 사용법 캡처
│  └─ chatgpt/
└─ posts/              # 게시물 주제별 이미지
   ├─ gta6/
   ├─ ps5/
   ├─ nintendo-switch/
   └─ tarae/
```

새 글을 만들 때는 `posts/<주제>/`를 먼저 만들고 원본, 편집본, 썸네일을 함께 보관합니다.

## 코드에서 사용하는 경로

`web/public`이 웹 루트이므로 앱 코드에서는 `/assets/...`로 참조합니다. 파일을 옮기면 `web/src`의 경로도 함께 수정하고 반드시 빌드를 확인합니다.

## 방 스킨

방 분위기는 낮/밤 레이어가 아니라 **통짜 스킨 일러스트**로 표현합니다.

- `rooms/budget-states/`: 기본 다락방 (잔액 단계 5장)
- `rooms/skins/`: 구매·장착용 별도 방 스킨
  - `cloud-dawn.png`, `weekend-game.png`
  - `cafe-corner.png`, `quiet-library.png`, `beach-cabin.png`, `christmas-nook.png`, `forest-camp.png`

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
2. **코드 자동 보정**
   - 방 이미지를 기준으로 슬롯 크기를 정면 시점에 맞게 재조정
   - 억지 `rotate/skew`는 제거
3. **기본 가구 bake (장기)**
   - 자주 쓰는 침대/러그는 방 이미지에 포함하고, 상점은 악세서리 위주

### 이미지 AI 프롬프트 템플릿

```text
Isometric-ish cozy attic interior prop, isolated on transparent background,
matching the perspective of a hand-drawn Korean webtoon room (slight downward angle),
warm muted palette, soft shading, no harsh drop shadow, game asset sprite
```

방 사진 한 장을 레퍼런스로 넣고 “match this room's camera angle and line weight”를 반드시 같이 넣습니다.
