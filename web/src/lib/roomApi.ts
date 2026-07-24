import { getClientKey, saveSession, type LocalSession } from "./session";
import { getSupabase } from "./supabase";
import type { KakaoPlace } from "./kakaoMaps";
import type { AnswerMap } from "./scoring";
import type { AnswerRow, Participant, PlaceVote, Room, RoomLocation } from "./types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_MEMBERS = 8;

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  return supabase;
}

function createRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function insertParticipant(room: Room, nickname: string): Promise<LocalSession> {
  const supabase = requireClient();
  const clientKey = getClientKey();
  const trimmed = nickname.trim();

  if (!trimmed) throw new Error("닉네임을 입력해 주세요.");
  if (trimmed.length > 8) throw new Error("닉네임은 8자까지 가능해요.");

  // 같은 기기에서 재입장하면 기존 참가자를 재사용합니다.
  const { data: existingByKey } = await supabase
    .from("participants")
    .select("*")
    .eq("room_id", room.id)
    .eq("client_key", clientKey)
    .maybeSingle();

  if (existingByKey) {
    const session = {
      roomId: room.id,
      roomCode: room.code,
      participantId: existingByKey.id as string,
      nickname: existingByKey.nickname as string,
    };
    saveSession(session);
    return session;
  }

  const { count, error: countError } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id);

  if (countError) throw countError;
  if ((count ?? 0) >= MAX_MEMBERS) throw new Error("이 방은 이미 인원이 가득 찼어요.");

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      room_id: room.id,
      nickname: trimmed,
      client_key: clientKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("같은 닉네임이 이미 있어요. 다른 이름을 써 주세요.");
    throw error;
  }

  const session = {
    roomId: room.id,
    roomCode: room.code,
    participantId: participant.id as string,
    nickname: participant.nickname as string,
  };
  saveSession(session);
  return session;
}

export async function createRoom(nickname: string, location: RoomLocation): Promise<LocalSession> {
  const supabase = requireClient();

  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
    throw new Error("지도에서 위치를 선택해 주세요.");
  }

  // 코드 충돌 시 몇 번 재시도합니다.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createRoomCode();
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        code,
        status: "waiting",
        lat: location.lat,
        lng: location.lng,
        location_name: location.locationName.trim() || "선택한 위치",
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }

    return insertParticipant(room as Room, nickname);
  }

  throw new Error("방 코드 생성에 실패했어요. 다시 시도해 주세요.");
}

export async function joinRoom(code: string, nickname: string): Promise<LocalSession> {
  const supabase = requireClient();
  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error("입장 코드 6자리를 확인해 주세요.");
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error) throw error;
  if (!room) throw new Error("해당 코드의 방을 찾지 못했어요.");
  if (room.status === "completed") throw new Error("이미 결과가 나온 방이에요.");

  return insertParticipant(room as Room, nickname);
}

export async function fetchRoom(roomId: string): Promise<Room> {
  const supabase = requireClient();
  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single();
  if (error) throw error;
  return data as Room;
}

export async function fetchParticipants(roomId: string): Promise<Participant[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Participant[];
}

export async function fetchAnswers(roomId: string): Promise<AnswerRow[]> {
  const supabase = requireClient();
  const { data, error } = await supabase.from("answers").select("*").eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as AnswerRow[];
}

export async function startAnswering(roomId: string): Promise<void> {
  const supabase = requireClient();
  const { count, error: countError } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (countError) throw countError;
  if ((count ?? 0) < 1) throw new Error("참가자가 있어야 시작할 수 있어요.");

  const { error } = await supabase
    .from("rooms")
    .update({ status: "answering" })
    .eq("id", roomId)
    .eq("status", "waiting");

  if (error) throw error;
}

export async function submitAnswers(
  roomId: string,
  participantId: string,
  payload: AnswerMap,
): Promise<void> {
  const supabase = requireClient();

  const { error: answerError } = await supabase.from("answers").upsert(
    {
      room_id: roomId,
      participant_id: participantId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id" },
  );
  if (answerError) throw answerError;

  const { error: doneError } = await supabase
    .from("participants")
    .update({ is_done: true })
    .eq("id", participantId)
    .eq("room_id", roomId);

  if (doneError) throw doneError;
}

/** 모두가 끝나면 방 상태를 completed로 바꿉니다. 여러 클라이언트가 동시에 호출해도 안전합니다. */
export async function markRoomCompletedIfReady(roomId: string, participants: Participant[]): Promise<void> {
  if (!participants.length || !participants.every((p) => p.is_done)) return;

  const supabase = requireClient();
  const { error } = await supabase
    .from("rooms")
    .update({ status: "completed" })
    .eq("id", roomId)
    .in("status", ["answering", "waiting"]);

  if (error) throw error;
}

export async function fetchPlaceVotes(roomId: string): Promise<PlaceVote[]> {
  const supabase = requireClient();
  const { data, error } = await supabase.from("place_votes").select("*").eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as PlaceVote[];
}

/** 아직 후보가 없을 때만 음식점 목록을 방에 저장합니다(동시 저장 시 한쪽만 반영). */
export async function savePlaceCandidatesIfEmpty(
  roomId: string,
  places: KakaoPlace[],
): Promise<KakaoPlace[]> {
  const supabase = requireClient();

  const { data: current, error: readError } = await supabase
    .from("rooms")
    .select("place_candidates")
    .eq("id", roomId)
    .single();
  if (readError) throw readError;

  const existing = current?.place_candidates as KakaoPlace[] | null;
  if (Array.isArray(existing) && existing.length > 0) return existing;

  const { data, error } = await supabase
    .from("rooms")
    .update({ place_candidates: places })
    .eq("id", roomId)
    .is("place_candidates", null)
    .select("place_candidates")
    .maybeSingle();

  if (error) throw error;
  if (Array.isArray(data?.place_candidates) && data.place_candidates.length > 0) {
    return data.place_candidates as KakaoPlace[];
  }

  // 다른 클라이언트가 먼저 저장한 경우 다시 읽습니다.
  const { data: again, error: againError } = await supabase
    .from("rooms")
    .select("place_candidates")
    .eq("id", roomId)
    .single();
  if (againError) throw againError;
  return (again?.place_candidates as KakaoPlace[]) ?? places;
}

/** 투표가 없을 때만 후보를 다시 검색해 덮어씁니다. */
export async function replacePlaceCandidates(roomId: string, places: KakaoPlace[]): Promise<void> {
  const supabase = requireClient();
  const { count, error: countError } = await supabase
    .from("place_votes")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("이미 투표가 시작돼서 후보를 바꿀 수 없어요.");
  }

  const { error } = await supabase
    .from("rooms")
    .update({ place_candidates: places })
    .eq("id", roomId);
  if (error) throw error;
}

export async function upsertPlaceVote(input: {
  roomId: string;
  participantId: string;
  place: KakaoPlace;
}): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from("place_votes").upsert(
    {
      room_id: input.roomId,
      participant_id: input.participantId,
      place_id: input.place.id,
      place_name: input.place.name,
      place_address: input.place.roadAddress || input.place.address || null,
      place_lat: input.place.lat,
      place_lng: input.place.lng,
      place_url: input.place.url || null,
    },
    { onConflict: "participant_id" },
  );
  if (error) throw error;
}

export { MAX_MEMBERS };
