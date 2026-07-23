import { MENUS, type Menu } from "../data/menus";
import { QUESTIONS } from "../data/questions";

export type AnswerMap = Record<string, string[]>;

export type RankedMenu = Menu & {
  total: number;
  min: number;
  score: number;
  match: number;
  reason: string;
};

/** 멤버별 답변을 합산해 공통 만족도가 높은 메뉴 TOP 3를 계산합니다. */
export function rankMenus(answerList: AnswerMap[], reroll = 0): RankedMenu[] {
  const scored = MENUS.map((menu) => {
    let total = 0;
    let min = 99;

    for (const answers of answerList) {
      let s = 0;
      if (answers.type?.includes(menu.type)) s += 3;
      if (answers.taste?.some((x) => menu.taste.includes(x))) s += 3;
      if (answers.temp?.includes(menu.temp) || answers.temp?.includes("warm")) s += 1;
      if (answers.full?.includes(menu.full)) s += 2;

      const priceIndex: Record<string, number> = { low: 0, mid: 1, high: 2 };
      const desired = answers.price?.[0];
      if (desired) s += Math.max(0, 2 - Math.abs(priceIndex[desired] - priceIndex[menu.price]));

      // 회피 옵션은 메뉴 이름 하드코딩 대신 tags/taste로 판별합니다.
      const avoid = answers.avoid || [];
      if (
        (avoid.includes("spicy") && menu.taste.includes("spicy")) ||
        (avoid.includes("meat") && menu.tags.includes("고기")) ||
        (avoid.includes("seafood") && menu.tags.includes("해산물")) ||
        (avoid.includes("noodle") && menu.tags.includes("면"))
      ) {
        s -= 20;
      }

      total += s;
      min = Math.min(min, s);
    }

    return { ...menu, total, min, score: total + min * 1.4 };
  }).sort((a, b) => b.score - a.score);

  const offset = (reroll * 3) % Math.max(3, scored.length - 2);
  let top = scored.slice(offset, offset + 3);
  if (top.length < 3) top = scored.slice(0, 3);

  const max = QUESTIONS.length * 11 * Math.max(1, answerList.length);

  return top.map((menu, index) => {
    const match = Math.max(68, Math.min(98, Math.round(74 + (menu.total / max) * 28)));
    const reason =
      index === 0
        ? "모두의 선택이 가장 고르게 겹쳤어요. 오늘의 1순위로 딱이에요!"
        : index === 1
          ? "맛과 예산 선호가 잘 맞는 든든한 차선책이에요."
          : "색다르게 즐기면서도 공통 취향을 놓치지 않았어요.";
    return { ...menu, match, reason };
  });
}
