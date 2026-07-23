import { useEffect, useState } from "react";
import {
  fetchAnswers,
  fetchParticipants,
  fetchRoom,
  markRoomCompletedIfReady,
} from "../lib/roomApi";
import { getSupabase } from "../lib/supabase";
import type { AnswerRow, Participant, Room } from "../lib/types";

type RoomSyncState = {
  room: Room | null;
  participants: Participant[];
  answers: AnswerRow[];
  loading: boolean;
  error: string | null;
};

/** 방/참가자/답변을 불러오고 Realtime으로 동기화합니다. */
export function useRoomSync(roomId: string | null): RoomSyncState {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loading, setLoading] = useState(Boolean(roomId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setParticipants([]);
      setAnswers([]);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase 환경변수가 없습니다.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const activeRoomId = roomId;

    async function refresh() {
      try {
        const [nextRoom, nextParticipants, nextAnswers] = await Promise.all([
          fetchRoom(activeRoomId),
          fetchParticipants(activeRoomId),
          fetchAnswers(activeRoomId),
        ]);
        if (cancelled) return;
        setRoom(nextRoom);
        setParticipants(nextParticipants);
        setAnswers(nextAnswers);
        setError(null);
        await markRoomCompletedIfReady(activeRoomId, nextParticipants);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "방 정보를 불러오지 못했어요.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    void refresh();

    const channel = supabase
      .channel(`room:${activeRoomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${activeRoomId}` },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `room_id=eq.${activeRoomId}` },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers", filter: `room_id=eq.${activeRoomId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, participants, answers, loading, error };
}
