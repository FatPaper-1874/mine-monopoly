import apiClient from "./index";
import { env } from "@mine-monopoly/env";

export async function joinRoomApi(roomId: string) {
	const response = await apiClient.get<{ hostPeerId: string; needCreate: boolean; deleteIntervalMs: number }>(
		`/room-router/join`,
		{ params: { roomId } }
	);
	return response;
}

export async function emitHostPeerId(
	roomId: string,
	hostPeerId: string,
	hostName: string,
	hostId: string,
): Promise<void> {
	await apiClient.post("/room-router/emit-host", {
		roomId,
		hostPeerId,
		hostName,
		hostId,
	});
}

export async function emitRoomHeart(roomId: string): Promise<void> {
	await apiClient.get("/room-router/heart", { params: { roomId } });
}

export function deleteRoom(roomId: string) {
	// 使用 sendBeacon 在页面卸载时清理房间 - 不使用 apiClient
	const url = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}/room-router/delete?roomId=${roomId}`;
	navigator.sendBeacon(url);
}

export async function getRandomPublicRoom() {
	const response = await apiClient.get<{ roomId: string }>("/room-router/random-public-room");
	return response;
}

export async function setRoomPrivate(roomId: string, isPrivate: boolean) {
	const response = await apiClient.post<{ roomId: string; isPrivate: boolean }>("/room-router/set-private", {
		roomId,
		isPrivate,
	});
	return response;
}

export async function setRoomStarted(roomId: string, isStarted: boolean) {
	const response = await apiClient.post<{ roomId: string; isStarted: boolean }>("/room-router/set-started", {
		roomId,
		isStarted,
	});
	return response;
}
