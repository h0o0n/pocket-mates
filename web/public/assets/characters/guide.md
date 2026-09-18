# 눈찌 캐릭터 · 옷(코스튬) 에셋 가이드

새 옷을 만들 때는 **기본 캐릭터(맨몸)가 가진 상태 PNG를 전부** 같은 옷 버전으로 만들어야 합니다.  
idle 한 장만 만들면 착용 시 통통·영수증·먹기 연출이 깨지거나 맨몸 모션만 보이게 됩니다.

> 이 문서는 `web/public/assets/characters/` 기준입니다.  
> 앱 코드 매핑은 `web/src/App.tsx`의 `dogOutfits` / `resolveDogVisualState` / `displayDogImage`를 참고하세요.

---

## 0. 최우선 규칙 — 원본 그림체·테두리·캐릭터 고정

옷을 입히거나 상태를 바꿀 때 **원본 눈찌 그 자체를 유지**합니다. 옷·소품만 바뀌고, 캐릭터 정체성은 절대 다시 그리지 않습니다.

### 0-1. 원본 테두리 보존 (Outline-preserving)

1. **해당 상태의 맨몸 PNG 외곽선을 그대로 보존**할 것. 선을 덧그리거나 더 굵게 만들지 않습니다.
2. 외곽선은 원본과 같은 짙은 먹색이며, 추가 검정 테두리·스티커 테두리·화이트 헤일로를 모두 금지합니다.
3. 선의 굵기·농도·종이 질감은 레퍼런스와 픽셀 단위로 비슷해야 합니다. `thick`, `bold outline`, `heavy stroke` 같은 지시는 사용하지 않습니다.
4. 머리·귀·몸·발 윤곽은 항상 **구름형 스캘럽(울퉁불퉁한 둥근 털 실루엣)**.
5. 흰 외곽이나 이중 테두리가 생기면 후처리로 검게 덮지 말고 재생성합니다. 자동 테두리 보정은 원본 선을 두껍게 만들 수 있어 금지합니다.

### 0-2. 캐릭터 원본 고정 (절대 바꾸지 말 것)

| 항목 | 고정 값 |
|------|---------|
| 얼굴 | 작은 검정 점 눈 2개 + 가로로 큰 타원 코 + 코 아래 아주 작은 입선 |
| 눈·코 상대 위치·비율 | 맨몸 레퍼런스와 동일 |
| 머리:몸 비율 | 치비(머리 ≈ 몸) |
| 팔·다리 | 짧고 뭉툭한 stub |
| 털 색 | 따뜻한 오프화이트/크림 (순백·그라데이션 금지) |
| 채색 | 플랫 + 미세 종이 그레인. 강한 그림자·하이라이트·그라데이션 금지 |

### 0-3. 작업 방법 (필수)

1. **해당 상태의 맨몸 PNG**를 1번 레퍼런스로 고정 (포즈·비율·테두리).
2. **같은 옷의 neutral(또는 `outfits/{id}.png`)** 을 2번 레퍼런스로 고정 (옷 디자인만).
3. 결과물은 “맨몸 상태 포즈 + 그 옷”이어야 함. **새 캐릭터·다른 견종·다른 얼굴로 재생성 금지.**
4. 배경은 맨몸 세트와 동일한 **완전 투명 RGBA**로 통일합니다. 검정·흰색·체커보드 배경을 실제 픽셀로 넣지 않습니다.
5. 출력 캔버스 크기와 종횡비는 해당 맨몸 상태 PNG와 일치시킵니다. 임의로 `1024×1024` 정사각형으로 자르거나 늘리지 않습니다.

### 0-4. 이미지 생성 프롬프트 템플릿

```text
Keep the EXACT same character from reference 1 (pose, proportions, face, scalloped fur silhouette,
original thin-to-medium hand-drawn outline, cream fur, paper grain). Do NOT redraw the dog.
Only add the clothing from reference 2 onto that exact body.
CRITICAL: preserve the original outline thickness exactly. Do not trace or add another outer stroke.
NO heavy outline, NO doubled outline, NO white sticker border, NO halo, NO outer rim.
Genuine transparent RGBA background; no black, white, or checkerboard background pixels.
Cream/clothes fills stay inside the existing outline.
Flat colors, no gradients, no text, no watermark.
Frontal hand-drawn game sprite, exact same canvas dimensions, aspect ratio and framing as reference 1.
```

생성 후에는 모서리 픽셀의 알파값이 `0`인지 확인하고, 원본과 나란히 놓아 외곽선 굵기·눈·코 위치를 육안 검수합니다.

---

## 1. 기본 캐릭터(맨몸) 필수 상태 세트

경로: `characters/states/`

| 상태 키 | 파일 | 언제 쓰이나 |
|--------|------|------------|
| `neutral` | `dog-neutral.png` | 기본 대기 (식비 낮음 + 예산 여유) |
| `chubby` | `dog-chubby.png` | 식비 비율 중간 (`foodLevel === 1`) |
| `very-chubby` | `dog-very-chubby.png` | 식비 비율 높음 (`foodLevel === 2`) |
| `receipt` | `dog-receipt.png` | 예산 단계 `worried` / `speechless` |
| `eating` | `dog-eating.png` | 모션 `eat` (간식·식비 연출) |

**옷을 추가할 때마다 위 5장을 §0 규칙을 지키며 같은 포즈·구도로 복제해 옷만 입혀 만듭니다.**  
한 장이라도 빠지면 그 옷은 미완성입니다.

---

## 2. CSS 모션 (PNG 추가 불필요)

아래는 **같은 PNG 위에 CSS transform**만 돌립니다. 옷별 추가 이미지는 만들지 않습니다.

| 모션 | 클래스 | 용도 |
|------|--------|------|
| `eat` | `.motion-eat` | 먹기 — **단, PNG는 `eating` 상태로 교체** |
| `hop` | `.motion-hop` | 점프 반응 |
| `nod` | `.motion-nod` | 고개 끄덕임 |
| walk bob | `.is-moving` | 방 안 배회 |

즉 PNG로 준비할 “모션/상태”는 **§1의 5장**이고, hop/nod/walk는 CSS 공용입니다.

---

## 3. 옷별 파일 규칙

### 폴더 구조

```text
characters/
├─ guide.md                 # 이 문서
├─ outfits/
│  └─ {outfitId}.png        # 상점 썸네일 (= dog-neutral-{id}와 동일 컷 권장)
└─ states/
   ├─ dog-{state}.png              # 맨몸
   └─ dog-{state}-{outfitId}.png   # 옷 버전 (state 5종 전부)
```

`{outfitId}`는 코드의 `OutfitId`와 동일: `scarf` | `sweater` | `raincoat` | …

### 체크리스트 (옷 1벌 = 상태 5장 + 상점 1장)

새 옷 `hoodie` 예시:

- [ ] `outfits/hoodie.png` — 상점·미리보기
- [ ] `states/dog-neutral-hoodie.png`
- [ ] `states/dog-chubby-hoodie.png`
- [ ] `states/dog-very-chubby-hoodie.png`
- [ ] `states/dog-receipt-hoodie.png`
- [ ] `states/dog-eating-hoodie.png`
- [ ] §0 테두리·얼굴·실루엣이 맨몸 레퍼런스와 동일한지 육안 확인
- [ ] `App.tsx`의 `dogOutfits` / 상태 맵에 경로 등록

`outfits/{id}.png`는 `dog-neutral-{id}.png`를 복사해도 됩니다. **상태 5장은 생략 불가.**

---

## 4. 현재 보유 현황

### 맨몸 — 완료

| 상태 | 파일 |
|------|------|
| neutral ~ eating | `states/dog-*.png` (접미사 없음) ✅ |

### 옷 — 완료 (2026-09-18 보정)

| outfitId | neutral | chubby | very-chubby | receipt | eating | 상점 `outfits/` |
|----------|---------|--------|-------------|---------|--------|-----------------|
| `scarf` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sweater` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `raincoat` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

파일명 예: `states/dog-chubby-scarf.png`, `states/dog-receipt-raincoat.png`

---

## 5. 코드 연결

착용 중에도 식비·예산 단계에 따라 **같은 옷의 해당 상태 PNG**를 고릅니다.

```ts
type DogVisualState = 'neutral' | 'chubby' | 'very-chubby' | 'receipt' | 'eating'

// 맨몸: /assets/characters/states/dog-{state}.png
// 옷:   /assets/characters/states/dog-{state}-{outfitId}.png
```

스모크 테스트:

1. 옷 착용 → neutral 표시
2. 식비 올려 chubby / very-chubby
3. 예산 압박 → receipt
4. 간식/식비 연출 → eating
5. hop/nod는 이미지 교체 없이 CSS만

---

## 6. 한 줄 요약

**옷 1벌 = 맨몸과 동일한 5상태 PNG 전부.**  
만들 때는 **원본 눈찌의 테두리와 얼굴을 그대로 보존**하고 옷만 입힌다.  
hop/nod/walk는 CSS 공용. idle만 만들고 끝내지 말 것.

---

## 7. 소비 유형 컴패니언 (companions/)

눈찌 가족 메이트 3종. DNA·포즈 5장은 맨몸과 동일하고, 아주 작은 악센트만 다릅니다.

| CompanionId | 이름 | 폴더 | 악센트 |
|-------------|------|------|--------|
| `foodie` | 밥찌 | `companions/foodie/` | 따뜻한 크림 + 작은 냅킨/턱받이 |
| `shopper` | 장찌 | `companions/shopper/` | 작은 택배 상자 |
| `subscriber` | 월스티 | `companions/subscriber/` | 라벤더 스카프 조각 |

각 폴더에 `dog-neutral|chubby|very-chubby|receipt|eating.png` 5장 필수.  
배경은 맨몸과 같이 **솔리드 블랙** (앱에서 투명 처리).  
코드: `CompanionId`, `companionDogStates`, 온보딩 설문 → `spendingType` / `companionId` 저장.  
자세한 규칙은 `companions/guide.md` 참고.
