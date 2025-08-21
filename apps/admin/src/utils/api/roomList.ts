import { RoomMapItem } from "@/interfaces/interfaces";
import {_axios} from "@/utils/axios";
export const getRoomList = async () => {
  const roomList = (await _axios.get("/room-router/room-list")) as RoomMapItem[];
  return roomList;
};