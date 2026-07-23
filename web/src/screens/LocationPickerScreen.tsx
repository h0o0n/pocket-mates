import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  DEFAULT_MAP_CENTER,
  isKakaoConfigured,
  loadKakaoMaps,
  relayoutMap,
  reverseGeocode,
  type KakaoMap,
  type KakaoMarker,
} from "../lib/kakaoMaps";
import type { RoomLocation } from "../lib/types";

type Props = {
  nickname: string;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: (location: RoomLocation) => Promise<void>;
};

type SearchHit = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * 방 만들기 2단계: 지도 클릭·검색으로 기준 위치를 고릅니다.
 * GPS 권한은 사용하지 않습니다.
 */
export function LocationPickerScreen({ nickname, busy, error, onBack, onConfirm }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<KakaoMap | null>(null);
  const markerInstance = useRef<KakaoMarker | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [lat, setLat] = useState(DEFAULT_MAP_CENTER.lat);
  const [lng, setLng] = useState(DEFAULT_MAP_CENTER.lng);
  const [locationName, setLocationName] = useState("서울시청 근처");
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!isKakaoConfigured()) {
        setLoadError("카카오맵 앱키가 없습니다. web/.env에 VITE_KAKAO_MAP_APP_KEY를 넣어 주세요.");
        return;
      }

      try {
        const kakao = await loadKakaoMaps();
        if (cancelled || !mapRef.current) return;

        const center = new kakao.maps.LatLng(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng);
        const map = new kakao.maps.Map(mapRef.current, { center, level: 4 });
        const marker = new kakao.maps.Marker({ position: center, map });

        mapInstance.current = map;
        markerInstance.current = marker;
        // display/레이아웃 직후 회색 빈 지도가 되는 경우를 막습니다.
        relayoutMap(map, center);

        // 지도 클릭 시 마커·주소를 갱신합니다.
        kakao.maps.event.addListener(map, "click", (...args: unknown[]) => {
          const mouseEvent = args[0] as { latLng: { getLat: () => number; getLng: () => number } };
          const nextLat = mouseEvent.latLng.getLat();
          const nextLng = mouseEvent.latLng.getLng();
          const position = new kakao.maps.LatLng(nextLat, nextLng);
          marker.setPosition(position);
          setLat(nextLat);
          setLng(nextLng);
          setSelected(true);
          void reverseGeocode(nextLat, nextLng).then((name) => {
            if (!cancelled) setLocationName(name);
          });
        });

        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "지도를 불러오지 못했어요.");
        }
      }
    }

    void initMap();
    return () => {
      cancelled = true;
    };
  }, []);

  function moveTo(nextLat: number, nextLng: number, name: string) {
    const kakao = window.kakao;
    if (!kakao || !mapInstance.current || !markerInstance.current) return;

    const position = new kakao.maps.LatLng(nextLat, nextLng);
    mapInstance.current.setCenter(position);
    markerInstance.current.setPosition(position);
    setLat(nextLat);
    setLng(nextLng);
    setLocationName(name);
    setSelected(true);
    setHits([]);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const keyword = query.trim();
    if (!keyword || !window.kakao) return;

    setSearching(true);
    setLoadError(null);

    try {
      const kakao = await loadKakaoMaps();
      const places = new kakao.maps.services.Places();
      const center = new kakao.maps.LatLng(lat, lng);

      await new Promise<void>((resolve) => {
        places.keywordSearch(
          keyword,
          (data, status) => {
            if (status === kakao.maps.services.Status.OK && data.length) {
              setHits(
                data.slice(0, 6).map((row) => ({
                  id: row.id,
                  name: row.place_name,
                  address: row.road_address_name || row.address_name,
                  lat: Number(row.y),
                  lng: Number(row.x),
                })),
              );
            } else {
              setHits([]);
              setLoadError("검색 결과가 없어요. 다른 키워드로 시도해 보세요.");
            }
            resolve();
          },
          { location: center, radius: 20000, size: 6 },
        );
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "검색에 실패했어요.");
    } finally {
      setSearching(false);
    }
  }

  async function handleConfirm() {
    if (!selected) {
      setLoadError("지도에서 위치를 클릭하거나 검색으로 골라 주세요.");
      return;
    }
    await onConfirm({ lat, lng, locationName });
  }

  return (
    <section className="screen active">
      <div className="panel map-panel">
        <button className="back" type="button" onClick={onBack} disabled={busy}>
          ← 돌아가기
        </button>
        <span className="step">위치 선택</span>
        <h2>어디서 먹을까요?</h2>
        <p className="sub">
          <b>{nickname}</b>님, 지도에서 만날 위치를 골라 주세요. 나중에 추천 메뉴 주변 음식점을 찾을 때 이 위치를
          기준으로 해요.
        </p>

        <form className="map-search" onSubmit={(event) => void handleSearch(event)}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소·주소 검색 (예: 강남역, 홍대)"
            autoComplete="off"
          />
          <button className="secondary" type="submit" disabled={searching || !ready}>
            {searching ? "검색 중..." : "검색"}
          </button>
        </form>

        {hits.length > 0 ? (
          <ul className="map-hits">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button type="button" onClick={() => moveTo(hit.lat, hit.lng, hit.name)}>
                  <strong>{hit.name}</strong>
                  <span>{hit.address}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="map-canvas" ref={mapRef} aria-label="위치 선택 지도" />
        {!ready && !loadError ? <p className="nearby-status">지도를 불러오는 중...</p> : null}

        <div className="map-selected">
          <small>선택한 위치</small>
          <strong>{selected ? locationName : "지도를 클릭하거나 검색해 주세요"}</strong>
        </div>

        {loadError || error ? <p className="form-error">{loadError || error}</p> : null}
        {ready && !loadError ? (
          <p className="map-hint">
            지도가 회색이거나 안 보이면: 카카오 콘솔 Web 도메인 등록과 (배포 시) Vercel의
            VITE_KAKAO_MAP_APP_KEY 설정을 확인해 주세요.
          </p>
        ) : null}

        <button
          className="primary full"
          type="button"
          disabled={busy || !ready || !selected}
          onClick={() => void handleConfirm()}
        >
          {busy ? "방 만드는 중..." : "이 위치로 방 만들기"}
          {!busy ? <span>→</span> : null}
        </button>
      </div>
    </section>
  );
}
