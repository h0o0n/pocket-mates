export type Question = {
  key: string;
  title: string;
  hint: string;
  multi?: boolean;
  max?: number;
  options: [string, string, string][];
};

export const QUESTIONS: Question[] = [
  {
    key: "type",
    title: "오늘 끌리는 음식 종류는?",
    hint: "여러 개 골라도 좋아요",
    multi: true,
    options: [
      ["korean", "🍚", "한식"],
      ["japanese", "🍣", "일식"],
      ["chinese", "🥟", "중식"],
      ["western", "🍝", "양식"],
      ["asian", "🌿", "아시안"],
    ],
  },
  {
    key: "taste",
    title: "지금 당기는 맛은?",
    hint: "최대 2개까지 선택해 주세요",
    multi: true,
    max: 2,
    options: [
      ["spicy", "🌶️", "매콤한 맛"],
      ["savory", "🧂", "짭짤·감칠맛"],
      ["mild", "☁️", "담백한 맛"],
      ["sweet", "🍯", "달콤한 맛"],
      ["fresh", "🍋", "상큼·깔끔한 맛"],
    ],
  },
  {
    key: "temp",
    title: "따뜻한 음식이 좋아요?",
    hint: "오늘의 기분과 날씨를 떠올려 보세요",
    options: [
      ["hot", "♨️", "뜨끈한 음식"],
      ["warm", "🍚", "상관없어요"],
      ["cool", "🧊", "시원한 음식"],
    ],
  },
  {
    key: "full",
    title: "얼마나 든든하게 먹을까요?",
    hint: "지금 배고픈 정도를 알려주세요",
    options: [
      ["light", "🙂", "가볍게"],
      ["full", "😋", "든든하게"],
    ],
  },
  {
    key: "price",
    title: "1인당 예산은 어느 정도?",
    hint: "메뉴 가격을 기준으로 추천해요",
    options: [
      ["low", "🪙", "1만원 이하"],
      ["mid", "💵", "1~2만원"],
      ["high", "💳", "2만원 이상"],
    ],
  },
  {
    key: "avoid",
    title: "오늘 피하고 싶은 것은?",
    hint: "여러 개 선택할 수 있어요",
    multi: true,
    options: [
      ["spicy", "🌶️", "매운 음식"],
      ["meat", "🥩", "고기"],
      ["seafood", "🐟", "해산물"],
      ["noodle", "🍜", "면"],
      ["none", "👌", "없어요"],
    ],
  },
];

export const AVATAR_COLORS = [
  "#ffd858",
  "#b7d990",
  "#ffb89f",
  "#b9d9ef",
  "#d9c0ec",
  "#f6cf8d",
  "#9cd8cf",
  "#f4aebb",
];
