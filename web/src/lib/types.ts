import type { AnswerMap } from "./scoring";
import type { KakaoPlace } from "./kakaoMaps";

export type RoomStatus = "waiting" | "answering" | "completed";

export type RoomLocation = {
  lat: number;
  lng: number;
  locationName: string;
};

export type Room = {
  id: string;
  code: string;
  status: RoomStatus;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  place_candidates: KakaoPlace[] | null;
  created_at: string;
};

export type Participant = {
  id: string;
  room_id: string;
  nickname: string;
  client_key: string;
  is_done: boolean;
  created_at: string;
};

export type AnswerRow = {
  id: string;
  room_id: string;
  participant_id: string;
  payload: AnswerMap;
  updated_at: string;
};

export type PlaceVote = {
  id: string;
  room_id: string;
  participant_id: string;
  place_id: string;
  place_name: string;
  place_address: string | null;
  place_lat: number | null;
  place_lng: number | null;
  place_url: string | null;
  created_at: string;
};
