import { useEffect, useMemo, useRef, useState } from "react";
import { kakaoDirectionsUrl, naverDirectionsUrl } from "../lib/directions";
import {
  isKakaoConfigured,
  loadKakaoMaps,
  relayoutMap,
  searchRestaurantsFromMenus,
  type KakaoMap,
  type KakaoMarker,
  type KakaoPlace,
} from "../lib/kakaoMaps";
import {
  replacePlaceCandidates,
  savePlaceCandidatesIfEmpty,
  upsertPlaceVote,
} from "../lib/roomApi";
import type { PlaceVote } from "../lib/types";

const RADIUS_OPTIONS = [
  { label: "500m", value: 500 },
  { label: "1km", value: 1000 },
  { label: "3km", value: 3000 },
] as const;

type Props = {
  roomId: string;
  participantId: string;
  menuNames: string[];
  lat: number;
  lng: number;
  locationName?: string | null;
  savedCandidates: KakaoPlace[] | null;
  placeVotes: PlaceVote[];
  participantCount: number;
};

/**
 * TOP 메뉴 키워드로 주변 음식점 5곳을 보여 주고, 투표·길찾기를 제공합니다.
 */
export function NearbyRestaurants({
  roomId,
  participantId,
  menuNames,
  lat,
  lng,
  locationName,
  savedCandidates,
  placeVotes,
  participantCount,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);

  const [places, setPlaces] = useState<KakaoPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [radius, setRadius] = useState(1000);
  const [voteBusy, setVoteBusy] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);

  const menuKey = menuNames.join("|");
  const hasVotes = placeVotes.length > 0;
  const myVote = placeVotes.find((vote) => vote.participant_id === participantId) ?? null;

  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of placeVotes) {
      counts.set(vote.place_id, (counts.get(vote.place_id) ?? 0) + 1);
    }
    return counts;
  }, [placeVotes]);

  // 과반, 또는 전원 투표 후 단독 1위면 “오늘 여기”로 확정합니다.
  const winner = useMemo(() => {
    if (!placeVotes.length || participantCount < 1) return null;
    const needed = Math.floor(participantCount / 2) + 1;
    const ranked = [...voteCounts.entries()].sort((a, b) => b[1] - a[1]);
    const [topId, topCount] = ranked[0] ?? [];
    if (!topId || !topCount) return null;

    const secondCount = ranked[1]?.[1] ?? 0;
    const uniqueLead = topCount > secondCount;
    const allVoted = placeVotes.length >= participantCount;
    const majority = topCount >= needed;

    if (!majority && !(allVoted && uniqueLead)) return null;

    const sample = placeVotes.find((vote) => vote.place_id === topId);
    const fromList = places.find((place) => place.id === topId);
    if (!sample && !fromList) return null;

    return {
      id: topId,
      name: fromList?.name ?? sample!.place_name,
      address: fromList?.roadAddress || fromList?.address || sample?.place_address || "",
      lat: fromList?.lat ?? sample?.place_lat ?? null,
      lng: fromList?.lng ?? sample?.place_lng ?? null,
      url: fromList?.url ?? sample?.place_url ?? null,
      count: topCount,
    };
  }, [placeVotes, participantCount, voteCounts, places]);

  useEffect(() => {
    let cancelled = false;
    const keywords = menuKey.split("|").filter(Boolean);

    async function run() {
      // 이미 방에 후보가 있으면 같은 목록으로 투표합니다.
      if (Array.isArray(savedCandidates) && savedCandidates.length > 0 && searchNonce === 0) {
        setPlaces(savedCandidates);
        setActiveId(savedCandidates[0]?.id ?? null);
        setLoading(false);
        setError(null);
        await drawMap(savedCandidates);
        return;
      }

      if (!isKakaoConfigured()) {
        setError("카카오맵 앱키가 없어 주변 음식점을 불러올 수 없어요.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const found = await searchRestaurantsFromMenus(keywords, lat, lng, 5, { radius });
        if (cancelled) return;

        if (!found.length) {
          setPlaces([]);
          setError("조건에 맞는 음식점을 찾지 못했어요. 거리나 필터를 바꿔 보세요.");
          setLoading(false);
          return;
        }

        let nextPlaces = found;
        if (hasVotes) {
          // 투표 중에는 방 후보를 덮지 않습니다.
          nextPlaces = Array.isArray(savedCandidates) && savedCandidates.length ? savedCandidates : found;
        } else if (searchNonce > 0) {
          await replacePlaceCandidates(roomId, found);
          nextPlaces = found;
        } else {
          nextPlaces = await savePlaceCandidatesIfEmpty(roomId, found);
        }

        if (cancelled) return;
        setPlaces(nextPlaces);
        setActiveId(nextPlaces[0]?.id ?? null);
        await drawMap(nextPlaces);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "음식점을 불러오지 못했어요.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function drawMap(list: KakaoPlace[]) {
      const kakao = await loadKakaoMaps();
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      if (cancelled || !mapRef.current) return;

      const center = new kakao.maps.LatLng(lat, lng);
      if (!mapInstance.current) {
        mapInstance.current = new kakao.maps.Map(mapRef.current, { center, level: 5 });
      } else {
        mapInstance.current.setCenter(center);
      }
      relayoutMap(mapInstance.current, center);

      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];

      list.forEach((place, index) => {
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

      markersRef.current.push(new kakao.maps.Marker({ position: center, map: mapInstance.current }));
    }

    void run();

    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
    };
    // radius는 "필터 적용" 시 searchNonce와 함께 반영됩니다.
  }, [menuKey, lat, lng, roomId, savedCandidates, searchNonce, radius, hasVotes]);

  function focusPlace(place: KakaoPlace) {
    const kakao = window.kakao;
    if (!kakao || !mapInstance.current) return;
    mapInstance.current.setCenter(new kakao.maps.LatLng(place.lat, place.lng));
    setActiveId(place.id);
  }

  async function handleVote(place: KakaoPlace) {
    setVoteBusy(true);
    setError(null);
    try {
      await upsertPlaceVote({ roomId, participantId, place });
    } catch (err) {
      setError(err instanceof Error ? err.message : "투표에 실패했어요.");
    } finally {
      setVoteBusy(false);
    }
  }

  function applyFilters() {
    if (hasVotes) {
      setError("이미 투표가 시작돼서 필터를 바꿀 수 없어요.");
      return;
    }
    setSearchNonce((value) => value + 1);
  }

  return (
    <section className="nearby-section">
      <div className="nearby-head">
        <span className="eyebrow">주변 음식점</span>
        <h3>이 메뉴로 갈 만한 곳 5곳</h3>
        <p>
          {locationName ? (
            <>
              <b>{locationName}</b> 기준으로 TOP 메뉴 키워드를 섞어 골랐어요. 마음에 드는 곳에 투표해 주세요.
            </>
          ) : (
            <>선택한 위치 기준으로 골랐어요. 마음에 드는 곳에 투표해 주세요.</>
          )}
        </p>
      </div>

      {winner ? (
        <div className="winner-banner">
          <small>오늘 여기!</small>
          <strong>{winner.name}</strong>
          <span>
            {winner.count}표로 확정 · {winner.address}
          </span>
          <div className="place-links">
            {winner.lat != null && winner.lng != null ? (
              <>
                <a href={kakaoDirectionsUrl(winner.name, winner.lat, winner.lng)} target="_blank" rel="noreferrer">
                  카카오 길찾기
                </a>
                <a href={naverDirectionsUrl(winner.name, winner.lat, winner.lng)} target="_blank" rel="noreferrer">
                  네이버 길찾기
                </a>
              </>
            ) : null}
            {winner.url ? (
              <a href={winner.url} target="_blank" rel="noreferrer">
                카카오맵
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="filter-bar">
        <div className="filter-group">
          <span>거리</span>
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={radius === option.value ? "chip active" : "chip"}
              disabled={hasVotes}
              onClick={() => setRadius(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button className="secondary" type="button" disabled={hasVotes || loading} onClick={applyFilters}>
          필터 적용
        </button>
      </div>
      <p className="map-hint">투표가 시작되면 음식점 후보는 고정됩니다.</p>

      {loading ? <p className="nearby-status">주변 음식점을 찾는 중...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="map-canvas nearby-map" ref={mapRef} aria-label="주변 음식점 지도" />

      <p className="vote-progress">
        투표 {placeVotes.length}/{participantCount}
        {myVote ? ` · 내 선택: ${myVote.place_name}` : " · 아직 투표하지 않았어요"}
      </p>

      {places.length > 0 ? (
        <ol className="nearby-list">
          {places.map((place, index) => {
            const count = voteCounts.get(place.id) ?? 0;
            const selected = myVote?.place_id === place.id;
            return (
              <li
                key={place.id}
                className={[place.id === activeId ? "active" : "", selected ? "voted" : ""].filter(Boolean).join(" ")}
              >
                <button type="button" className="place-main" onClick={() => focusPlace(place)}>
                  <span className="nearby-rank">{index + 1}</span>
                  <div>
                    <strong>{place.name}</strong>
                    <em>#{place.menuKeyword}</em>
                    <span>{place.roadAddress || place.address}</span>
                    {place.distance ? <small>약 {place.distance}m</small> : null}
                    <small className="vote-count">{count}표</small>
                  </div>
                </button>
                <div className="place-actions">
                  <button
                    type="button"
                    className={selected ? "vote-btn selected" : "vote-btn"}
                    disabled={voteBusy}
                    onClick={() => void handleVote(place)}
                  >
                    {selected ? "내 표" : "투표"}
                  </button>
                  <a href={kakaoDirectionsUrl(place.name, place.lat, place.lng)} target="_blank" rel="noreferrer">
                    카카오 길찾기
                  </a>
                  <a href={naverDirectionsUrl(place.name, place.lat, place.lng)} target="_blank" rel="noreferrer">
                    네이버 길찾기
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
