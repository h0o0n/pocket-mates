import { useEffect, useRef, useState } from "react";
import {
  isKakaoConfigured,
  loadKakaoMaps,
  relayoutMap,
  searchRestaurantsFromMenus,
  type KakaoMap,
  type KakaoMarker,
  type KakaoPlace,
} from "../lib/kakaoMaps";

type Props = {
  menuNames: string[];
  lat: number;
  lng: number;
  locationName?: string | null;
};

/**
 * TOP 메뉴 키워드를 섞어 기준 위치 주변 음식점 5곳을 지도·리스트로 보여줍니다.
 */
export function NearbyRestaurants({ menuNames, lat, lng, locationName }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);

  const [places, setPlaces] = useState<KakaoPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 배열 참조가 바뀌어도 내용이 같으면 재검색하지 않도록 키를 고정합니다.
  const menuKey = menuNames.join("|");

  useEffect(() => {
    let cancelled = false;
    const keywords = menuKey.split("|").filter(Boolean);

    async function run() {
      if (!isKakaoConfigured()) {
        setError("카카오맵 앱키가 없어 주변 음식점을 불러올 수 없어요.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const kakao = await loadKakaoMaps();
        const found = await searchRestaurantsFromMenus(keywords, lat, lng, 5);
        if (cancelled) return;

        setPlaces(found);
        if (!found.length) {
          setError("주변에 맞는 음식점을 찾지 못했어요. 위치를 바꿔 새 방을 만들어 보세요.");
          setLoading(false);
          return;
        }

        // 맵 컨테이너가 그려진 뒤 초기화합니다.
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        if (cancelled || !mapRef.current) return;

        const center = new kakao.maps.LatLng(lat, lng);
        if (!mapInstance.current) {
          mapInstance.current = new kakao.maps.Map(mapRef.current, { center, level: 5 });
        } else {
          mapInstance.current.setCenter(center);
        }
        relayoutMap(mapInstance.current, center);

        // 이전 마커 제거
        for (const marker of markersRef.current) marker.setMap(null);
        markersRef.current = [];

        found.forEach((place, index) => {
          const position = new kakao.maps.LatLng(place.lat, place.lng);
          const marker = new kakao.maps.Marker({ position, map: mapInstance.current! });
          markersRef.current.push(marker);

          const info = new kakao.maps.InfoWindow({
            content: `<div style="padding:8px 10px;font-size:13px;"><b>${index + 1}. ${place.name}</b></div>`,
          });

          kakao.maps.event.addListener(marker, "click", () => {
            info.open(mapInstance.current!, marker);
            setActiveId(place.id);
          });
        });

        // 기준점 마커도 표시
        const baseMarker = new kakao.maps.Marker({ position: center, map: mapInstance.current });
        markersRef.current.push(baseMarker);

        setActiveId(found[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "음식점을 불러오지 못했어요.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
    };
  }, [menuKey, lat, lng]);

  function focusPlace(place: KakaoPlace) {
    const kakao = window.kakao;
    if (!kakao || !mapInstance.current) return;
    mapInstance.current.setCenter(new kakao.maps.LatLng(place.lat, place.lng));
    setActiveId(place.id);
  }

  return (
    <section className="nearby-section">
      <div className="nearby-head">
        <span className="eyebrow">주변 음식점</span>
        <h3>이 메뉴로 갈 만한 곳 5곳</h3>
        <p>
          {locationName ? (
            <>
              <b>{locationName}</b> 기준으로 TOP 메뉴 키워드를 섞어 골랐어요.
            </>
          ) : (
            <>선택한 위치 기준으로 TOP 메뉴 키워드를 섞어 골랐어요.</>
          )}
        </p>
      </div>

      {loading ? <p className="nearby-status">주변 음식점을 찾는 중...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="map-canvas nearby-map" ref={mapRef} aria-label="주변 음식점 지도" />

      {places.length > 0 ? (
        <ol className="nearby-list">
          {places.map((place, index) => (
            <li key={place.id} className={place.id === activeId ? "active" : ""}>
              <button type="button" onClick={() => focusPlace(place)}>
                <span className="nearby-rank">{index + 1}</span>
                <div>
                  <strong>{place.name}</strong>
                  <em>#{place.menuKeyword}</em>
                  <span>{place.roadAddress || place.address}</span>
                  {place.distance ? <small>약 {place.distance}m</small> : null}
                </div>
              </button>
              {place.url ? (
                <a href={place.url} target="_blank" rel="noreferrer">
                  카카오맵
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
