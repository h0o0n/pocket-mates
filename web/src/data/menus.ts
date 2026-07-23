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

/** 추천 후보 메뉴. tags의 고기/해산물/면은 회피 옵션 판별에 사용됩니다. */
export const MENUS: Menu[] = [
  // 한식
  { name: "김치찌개", emoji: "🍲", type: "korean", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["얼큰한", "한식", "든든한"] },
  { name: "된장찌개", emoji: "🥣", type: "korean", taste: ["savory", "mild"], temp: "hot", full: "full", price: "low", tags: ["구수한", "한식", "가성비"] },
  { name: "순두부찌개", emoji: "🍲", type: "korean", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["얼큰한", "한식", "국물"] },
  { name: "삼겹살", emoji: "🥓", type: "korean", taste: ["savory"], temp: "hot", full: "full", price: "high", tags: ["고기", "회식", "든든한"] },
  { name: "갈비탕", emoji: "🍖", type: "korean", taste: ["savory", "mild"], temp: "hot", full: "full", price: "high", tags: ["고기", "한식", "따뜻한"] },
  { name: "불고기", emoji: "🥩", type: "korean", taste: ["sweet", "savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "한식", "달콤한"] },
  { name: "닭갈비", emoji: "🍗", type: "korean", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "매콤한", "함께"] },
  { name: "치킨", emoji: "🍗", type: "korean", taste: ["savory", "spicy"], temp: "hot", full: "full", price: "mid", tags: ["고기", "배달", "나눠먹기"] },
  { name: "비빔밥", emoji: "🥗", type: "korean", taste: ["spicy", "fresh"], temp: "warm", full: "full", price: "mid", tags: ["한식", "채소", "균형식"] },
  { name: "김밥", emoji: "🍙", type: "korean", taste: ["mild", "savory"], temp: "cool", full: "light", price: "low", tags: ["분식", "가벼운", "가성비"] },
  { name: "국밥", emoji: "🍜", type: "korean", taste: ["savory", "mild"], temp: "hot", full: "full", price: "low", tags: ["든든한", "한식", "가성비"] },
  { name: "칼국수", emoji: "🍜", type: "korean", taste: ["mild", "savory"], temp: "hot", full: "full", price: "low", tags: ["따뜻한", "면", "가성비"] },
  { name: "냉면", emoji: "🧊", type: "korean", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "mid", tags: ["시원한", "면", "깔끔한"] },
  { name: "떡볶이", emoji: "🍢", type: "korean", taste: ["spicy", "sweet"], temp: "hot", full: "light", price: "low", tags: ["분식", "매콤달콤", "가성비"] },
  { name: "순대국", emoji: "🥣", type: "korean", taste: ["savory"], temp: "hot", full: "full", price: "low", tags: ["고기", "한식", "든든한"] },
  { name: "보쌈", emoji: "🥬", type: "korean", taste: ["savory", "mild"], temp: "warm", full: "full", price: "high", tags: ["고기", "회식", "함께"] },
  { name: "제육볶음", emoji: "🌶️", type: "korean", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "매콤한", "한식"] },
  { name: "감자탕", emoji: "🦴", type: "korean", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "얼큰한", "국물"] },
  { name: "샤브샤브", emoji: "🥘", type: "korean", taste: ["fresh", "mild"], temp: "hot", full: "full", price: "high", tags: ["따뜻한", "채소", "함께"] },
  { name: "부대찌개", emoji: "🌭", type: "korean", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["얼큰한", "함께", "든든한"] },

  // 일식
  { name: "초밥", emoji: "🍣", type: "japanese", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "high", tags: ["깔끔한", "일식", "해산물"] },
  { name: "회덮밥", emoji: "🐟", type: "japanese", taste: ["fresh", "spicy"], temp: "cool", full: "full", price: "mid", tags: ["해산물", "일식", "깔끔한"] },
  { name: "돈카츠", emoji: "🍱", type: "japanese", taste: ["savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "바삭한", "든든한"] },
  { name: "라멘", emoji: "🍜", type: "japanese", taste: ["savory", "spicy"], temp: "hot", full: "full", price: "mid", tags: ["면", "국물", "든든한"] },
  { name: "우동", emoji: "🍜", type: "japanese", taste: ["mild", "savory"], temp: "hot", full: "full", price: "low", tags: ["면", "따뜻한", "가성비"] },
  { name: "규동", emoji: "🍛", type: "japanese", taste: ["sweet", "savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "일식", "든든한"] },
  { name: "카레라이스", emoji: "🍛", type: "japanese", taste: ["savory", "mild"], temp: "hot", full: "full", price: "low", tags: ["든든한", "일식", "가성비"] },
  { name: "가츠동", emoji: "🍱", type: "japanese", taste: ["savory", "sweet"], temp: "hot", full: "full", price: "mid", tags: ["고기", "일식", "든든한"] },
  { name: "오코노미야키", emoji: "🥞", type: "japanese", taste: ["savory", "sweet"], temp: "hot", full: "full", price: "mid", tags: ["일식", "나눠먹기", "든든한"] },
  { name: "소바", emoji: "🍜", type: "japanese", taste: ["mild", "fresh"], temp: "cool", full: "light", price: "mid", tags: ["면", "깔끔한", "가벼운"] },

  // 중식
  { name: "마라탕", emoji: "🌶️", type: "chinese", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["매운맛", "중식", "골라먹기"] },
  { name: "마라샹궈", emoji: "🔥", type: "chinese", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["매운맛", "중식", "든든한"] },
  { name: "짜장면", emoji: "🍜", type: "chinese", taste: ["sweet", "savory"], temp: "hot", full: "full", price: "low", tags: ["중식", "면", "가성비"] },
  { name: "짬뽕", emoji: "🌶️", type: "chinese", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["면", "얼큰한", "해산물"] },
  { name: "탕수육", emoji: "🍗", type: "chinese", taste: ["sweet", "savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "중식", "나눠먹기"] },
  { name: "볶음밥", emoji: "🍚", type: "chinese", taste: ["savory", "mild"], temp: "hot", full: "full", price: "low", tags: ["중식", "든든한", "가성비"] },
  { name: "양꼬치", emoji: "🍢", type: "chinese", taste: ["savory", "spicy"], temp: "hot", full: "full", price: "mid", tags: ["고기", "중식", "함께"] },
  { name: "딤섬", emoji: "🥟", type: "chinese", taste: ["mild", "savory"], temp: "warm", full: "light", price: "mid", tags: ["중식", "가벼운", "골라먹기"] },
  { name: "마파두부", emoji: "🌶️", type: "chinese", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "low", tags: ["매운맛", "중식", "가성비"] },

  // 양식
  { name: "피자", emoji: "🍕", type: "western", taste: ["savory"], temp: "hot", full: "full", price: "high", tags: ["치즈", "양식", "나눠먹기"] },
  { name: "파스타", emoji: "🍝", type: "western", taste: ["savory", "mild"], temp: "hot", full: "full", price: "high", tags: ["양식", "분위기", "면"] },
  { name: "햄버거", emoji: "🍔", type: "western", taste: ["savory"], temp: "hot", full: "full", price: "mid", tags: ["고기", "양식", "든든한"] },
  { name: "스테이크", emoji: "🥩", type: "western", taste: ["savory"], temp: "hot", full: "full", price: "high", tags: ["고기", "양식", "분위기"] },
  { name: "리조또", emoji: "🍚", type: "western", taste: ["savory", "mild"], temp: "hot", full: "full", price: "high", tags: ["양식", "크림", "분위기"] },
  { name: "샌드위치", emoji: "🥪", type: "western", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "mid", tags: ["가벼운", "양식", "간편식"] },
  { name: "샐러드", emoji: "🥗", type: "western", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "mid", tags: ["채소", "건강식", "가벼운"] },
  { name: "포케", emoji: "🥗", type: "western", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "mid", tags: ["가벼운", "채소", "해산물"] },
  { name: "타코", emoji: "🌮", type: "western", taste: ["spicy", "savory"], temp: "warm", full: "full", price: "mid", tags: ["양식", "매콤한", "골라먹기"] },
  { name: "브런치 플레이트", emoji: "🍳", type: "western", taste: ["mild", "savory"], temp: "warm", full: "full", price: "high", tags: ["양식", "분위기", "든든한"] },

  // 아시안
  { name: "쌀국수", emoji: "🍜", type: "asian", taste: ["fresh", "mild"], temp: "hot", full: "light", price: "mid", tags: ["국물", "면", "깔끔한"] },
  { name: "팟타이", emoji: "🥢", type: "asian", taste: ["sweet", "savory"], temp: "hot", full: "full", price: "mid", tags: ["아시안", "면", "새콤달콤"] },
  { name: "분짜", emoji: "🥬", type: "asian", taste: ["fresh", "savory"], temp: "cool", full: "full", price: "mid", tags: ["고기", "아시안", "상큼한"] },
  { name: "나시고랭", emoji: "🍚", type: "asian", taste: ["savory", "spicy"], temp: "hot", full: "full", price: "mid", tags: ["아시안", "든든한", "매콤한"] },
  { name: "미고랭", emoji: "🍜", type: "asian", taste: ["savory", "sweet"], temp: "hot", full: "full", price: "mid", tags: ["면", "아시안", "든든한"] },
  { name: "똠얌꿍", emoji: "🦐", type: "asian", taste: ["spicy", "fresh"], temp: "hot", full: "light", price: "mid", tags: ["해산물", "국물", "매콤한"] },
  { name: "카레", emoji: "🍛", type: "asian", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["아시안", "든든한", "향신료"] },
  { name: "케밥", emoji: "🥙", type: "asian", taste: ["savory", "spicy"], temp: "hot", full: "full", price: "mid", tags: ["고기", "간편식", "든든한"] },
  { name: "월남쌈", emoji: "🥬", type: "asian", taste: ["fresh", "mild"], temp: "cool", full: "light", price: "mid", tags: ["채소", "가벼운", "상큼한"] },
  { name: "인도 커리", emoji: "🍛", type: "asian", taste: ["spicy", "savory"], temp: "hot", full: "full", price: "mid", tags: ["아시안", "향신료", "든든한"] },
];
