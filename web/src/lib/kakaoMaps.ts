/** 서울시청 — 위치 미선택 시 지도 초기 중심 */
export const DEFAULT_MAP_CENTER = { lat: 37.566826, lng: 126.9786567 };

export type KakaoPlace = {
  id: string;
  name: string;
  address: string;
  roadAddress: string;
  phone: string;
  url: string;
  lat: number;
  lng: number;
  distance?: string;
  /** 검색에 사용된 메뉴 키워드 */
  menuKeyword: string;
};

type KakaoMapsNamespace = {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Map: new (
      container: HTMLElement,
      options: { center: KakaoLatLng; level: number },
    ) => KakaoMap;
    Marker: new (options: { position: KakaoLatLng; map?: KakaoMap }) => KakaoMarker;
    InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
    event: {
      // 카카오 SDK 이벤트 인자는 API마다 달라서 느슨하게 둡니다.
      addListener: (target: object, type: string, handler: (...args: unknown[]) => void) => void;
    };
    services: {
      Places: new () => KakaoPlaces;
      Geocoder: new () => KakaoGeocoder;
      Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    };
  };
};

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  setCenter: (latlng: KakaoLatLng) => void;
  getCenter: () => KakaoLatLng;
  relayout: () => void;
};

type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (latlng: KakaoLatLng) => void;
  getPosition: () => KakaoLatLng;
};

type KakaoInfoWindow = {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
};

type KakaoPlaceResult = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  place_url: string;
  x: string;
  y: string;
  distance?: string;
};

type KakaoPlaces = {
  keywordSearch: (
    keyword: string,
    callback: (data: KakaoPlaceResult[], status: string) => void,
    options?: {
      location?: KakaoLatLng;
      radius?: number;
      size?: number;
      category_group_code?: string;
    },
  ) => void;
};

type KakaoGeocoder = {
  coord2Address: (
    lng: number,
    lat: number,
    callback: (
      result: Array<{
        address?: { address_name?: string };
        road_address?: { address_name?: string };
      }>,
      status: string,
    ) => void,
  ) => void;
};

declare global {
  interface Window {
    kakao?: KakaoMapsNamespace;
  }
}

let loadPromise: Promise<KakaoMapsNamespace> | null = null;

function getAppKey(): string {
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
  if (!key) {
    throw new Error("VITE_KAKAO_MAP_APP_KEY 환경변수가 없습니다.");
  }
  return key;
}

const KAKAO_SETUP_HINT =
  "카카오 Developers → 내 애플리케이션 → 앱 설정에서 JavaScript 키를 확인하고, 플랫폼(Web)에 현재 사이트 도메인(예: http://localhost:5173 또는 Vercel 주소)을 등록해 주세요. Vercel이면 Environment Variable에 VITE_KAKAO_MAP_APP_KEY도 넣어야 합니다.";

/** 카카오맵 JS SDK(+ services)를 한 번만 로드합니다. */
export function loadKakaoMaps(): Promise<KakaoMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 카카오맵을 사용할 수 있어요."));
  }

  if (window.kakao?.maps) {
    return new Promise((resolve, reject) => {
      try {
        window.kakao!.maps.load(() => resolve(window.kakao!));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(KAKAO_SETUP_HINT));
      }
    });
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const appKey = getAppKey();
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) {
        loadPromise = null;
        reject(new Error(`카카오맵 SDK를 불러오지 못했어요. ${KAKAO_SETUP_HINT}`));
        return;
      }
      try {
        window.kakao.maps.load(() => resolve(window.kakao!));
      } catch (err) {
        loadPromise = null;
        reject(err instanceof Error ? err : new Error(KAKAO_SETUP_HINT));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error(`카카오맵 스크립트 로드에 실패했어요. ${KAKAO_SETUP_HINT}`));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** 컨테이너 크기가 잡힌 뒤 타일이 깨지지 않도록 레이아웃을 다시 잡습니다. */
export function relayoutMap(map: KakaoMap, center?: KakaoLatLng): void {
  const apply = () => {
    map.relayout();
    if (center) map.setCenter(center);
  };
  requestAnimationFrame(apply);
  window.setTimeout(apply, 120);
  window.setTimeout(apply, 400);
}

export function isKakaoConfigured(): boolean {
  return Boolean(import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim());
}

/** 좌표 → 주소 문자열 (실패 시 좌표 문자열 반환) */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const kakao = await loadKakaoMaps();
  const geocoder = new kakao.maps.services.Geocoder();

  return new Promise((resolve) => {
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        const road = result[0].road_address?.address_name;
        const jibun = result[0].address?.address_name;
        resolve(road || jibun || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        return;
      }
      resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    });
  });
}

function toPlace(row: KakaoPlaceResult, menuKeyword: string): KakaoPlace {
  return {
    id: row.id,
    name: row.place_name,
    address: row.address_name,
    roadAddress: row.road_address_name,
    phone: row.phone,
    url: row.place_url,
    lat: Number(row.y),
    lng: Number(row.x),
    distance: row.distance,
    menuKeyword,
  };
}

/** 단일 메뉴 키워드로 주변 음식점을 검색합니다. */
async function searchPlacesByKeyword(
  keyword: string,
  lat: number,
  lng: number,
  size = 5,
): Promise<KakaoPlace[]> {
  const kakao = await loadKakaoMaps();
  const places = new kakao.maps.services.Places();
  const location = new kakao.maps.LatLng(lat, lng);

  return new Promise((resolve) => {
    places.keywordSearch(
      keyword,
      (data, status) => {
        if (status !== kakao.maps.services.Status.OK || !data?.length) {
          resolve([]);
          return;
        }
        resolve(data.map((row) => toPlace(row, keyword)));
      },
      {
        location,
        radius: 3000,
        size,
        // FD6: 음식점 카테고리 그룹
        category_group_code: "FD6",
      },
    );
  });
}

/**
 * TOP 메뉴 키워드들을 섞어 주변 음식점 N곳을 고릅니다.
 * 각 메뉴 검색 결과를 라운드로빈으로 가져와 중복(id)을 제거합니다.
 */
export async function searchRestaurantsFromMenus(
  menuNames: string[],
  lat: number,
  lng: number,
  limit = 5,
): Promise<KakaoPlace[]> {
  const keywords = menuNames.map((name) => name.trim()).filter(Boolean);
  if (!keywords.length) return [];

  const perKeyword = await Promise.all(
    keywords.map((keyword) => searchPlacesByKeyword(keyword, lat, lng, limit)),
  );

  const picked: KakaoPlace[] = [];
  const seen = new Set<string>();
  let round = 0;
  let addedInRound = true;

  while (picked.length < limit && addedInRound) {
    addedInRound = false;
    for (const list of perKeyword) {
      const candidate = list[round];
      if (!candidate || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      picked.push(candidate);
      addedInRound = true;
      if (picked.length >= limit) break;
    }
    round += 1;
  }

  // 카테고리 필터로 결과가 부족하면, 카테고리 없이 한 번 더 보완합니다.
  if (picked.length < limit) {
    const kakao = await loadKakaoMaps();
    const places = new kakao.maps.services.Places();
    const location = new kakao.maps.LatLng(lat, lng);

    for (const keyword of keywords) {
      if (picked.length >= limit) break;

      const extras = await new Promise<KakaoPlace[]>((resolve) => {
        places.keywordSearch(
          keyword,
          (data, status) => {
            if (status !== kakao.maps.services.Status.OK || !data?.length) {
              resolve([]);
              return;
            }
            resolve(data.map((row) => toPlace(row, keyword)));
          },
          { location, radius: 5000, size: 10 },
        );
      });

      for (const place of extras) {
        if (seen.has(place.id)) continue;
        seen.add(place.id);
        picked.push(place);
        if (picked.length >= limit) break;
      }
    }
  }

  return picked;
}

export type { KakaoMap, KakaoMarker, KakaoLatLng, KakaoMapsNamespace };
