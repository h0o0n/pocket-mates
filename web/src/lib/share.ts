/** 입장 코드가 포함된 초대 링크를 만듭니다. */
export function buildInviteUrl(roomCode: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("code", roomCode.trim().toUpperCase());
  return url.toString();
}

/** 카카오톡 등에 붙여넣을 공유 문구 */
export function buildInviteText(roomCode: string, locationName?: string | null): string {
  const link = buildInviteUrl(roomCode);
  const where = locationName ? `\n📍 ${locationName}` : "";
  return `오늘 뭐 먹지? 같이 골라보자!\n입장 코드: ${roomCode.toUpperCase()}${where}\n${link}`;
}

/** URL의 ?code= 값을 읽고, 필요하면 주소창에서 제거합니다. */
export function readInviteCodeFromUrl(clear = true): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("code")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9]{6}$/.test(raw)) return null;

  if (clear) {
    params.delete("code");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }
  return raw;
}
