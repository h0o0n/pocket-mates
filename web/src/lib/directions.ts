/** 카카오맵 길찾기 (목적지 좌표) */
export function kakaoDirectionsUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
}

/** 네이버지도 길찾기 (목적지 좌표) */
export function naverDirectionsUrl(name: string, lat: number, lng: number): string {
  const destination = `${lng},${lat},${name}`;
  return `https://map.naver.com/v5/directions/-/${encodeURIComponent(destination)}/-/walk`;
}
