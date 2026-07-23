export type Menu = {
  name: string;
  emoji: string;
  type: string;
  taste: string[];
  temp: string;
  full: string;
  price: string;
  tags: string[];
};

export const MENUS: Menu[] = [
  { name: "김치찌개", emoji: "🍲", type: "korean", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["얼큰한", "한식", "든든한"] },
  { name: "삼겹살", emoji: "🥓", type: "korean", taste: ["savory"], temp: "hot", full: "full", price: "high", tags: ["고기", "회식", "든든한"] },
  { name: "비빔밥", emoji: "🥗", type: "korean", taste: ["spicy", "fresh"], temp: "warm", full: "full", price: "mid", tags: ["한식", "채소", "균형식"] },
  { name: "칼국수", emoji: "🍜", type: "korean", taste: ["mild", "savory"], temp: "hot", full: "full", price: "low", tags: ["따뜻한", "면", "가성비"] },
  { name: "초밥", emoji: "🍣", type: "japanese", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "high", tags: ["깔끔한", "일식", "해산물"] },
  { name: "돈카츠", emoji: "🍱", type: "japanese", taste: ["savory"], temp: "hot", full: "full", price: "mid", tags: ["바삭한", "일식", "든든한"] },
  { name: "마라탕", emoji: "🌶️", type: "chinese", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["매운맛", "중식", "골라먹기"] },
  { name: "짜장면", emoji: "🍜", type: "chinese", taste: ["sweet", "savory"], temp: "hot", full: "full", price: "low", tags: ["중식", "면", "가성비"] },
  { name: "피자", emoji: "🍕", type: "western", taste: ["savory"], temp: "hot", full: "full", price: "high", tags: ["치즈", "양식", "나눠먹기"] },
  { name: "파스타", emoji: "🍝", type: "western", taste: ["savory", "mild"], temp: "hot", full: "full", price: "high", tags: ["양식", "분위기", "면"] },
  { name: "쌀국수", emoji: "🍜", type: "asian", taste: ["fresh", "mild"], temp: "hot", full: "light", price: "mid", tags: ["국물", "아시안", "깔끔한"] },
  { name: "팟타이", emoji: "🥢", type: "asian", taste: ["sweet", "savory"], temp: "hot", full: "full", price: "mid", tags: ["아시안", "면", "새콤달콤"] },
  { name: "샤브샤브", emoji: "🥘", type: "korean", taste: ["fresh", "mild"], temp: "hot", full: "full", price: "high", tags: ["따뜻한", "채소", "함께"] },
  { name: "포케", emoji: "🥗", type: "western", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "mid", tags: ["가벼운", "채소", "건강식"] },
  { name: "떡볶이", emoji: "🍢", type: "korean", taste: ["spicy", "sweet"], temp: "hot", full: "light", price: "low", tags: ["분식", "매콤달콤", "가성비"] },
];
