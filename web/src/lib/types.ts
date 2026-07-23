import type { AnswerMap } from "./scoring";

export type RoomStatus = "waiting" | "answering" | "completed";

export type Room = {
  id: string;
  code: string;
  status: RoomStatus;
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
