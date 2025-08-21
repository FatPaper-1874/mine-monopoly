import { __MONOPOLYSERVER__ } from "@src/../global.config";
import axios from "axios";

export async function joinRoomApi(roomId: string) {
	const { hostPeerId, needCreate, deleteIntervalMs } = (
		await axios.get(`${__MONOPOLYSERVER__}/room-router/join`, {
			params: { roomId },
		})
	).data as any;
	return { hostPeerId, needCreate, deleteIntervalMs };
}

export async function emitHostPeerId(roomId: string, hostPeerId: string, hostName: string, hostId: string) {
	await axios.post(`${__MONOPOLYSERVER__}/room-router/emit-host`, { roomId, hostPeerId, hostName, hostId });
}

export async function emitRoomHeart(roomId: string) {
	await axios.get(`${__MONOPOLYSERVER__}/room-router/heart`, { params: { roomId } });
}

export function deleteRoom(roomId: string) {
	navigator.sendBeacon(`${__MONOPOLYSERVER__}/room-router/delete?roomId=${roomId}`);
}

export async function getRandomPublicRoom() {
	return (await axios.get(`${__MONOPOLYSERVER__}/room-router/random-public-room`)) as { roomId: string };
}

export async function setRoomPrivate(roomId: string, isPrivate: boolean) {
	return (await axios.post(`${__MONOPOLYSERVER__}/room-router/set-private`, { roomId, isPrivate })) as {
		roomId: string;
		isPrivate: boolean;
	};
}

export async function setRoomStarted(roomId: string, isStarted: boolean) {
	return (await axios.post(`${__MONOPOLYSERVER__}/room-router/set-started`, { roomId, isStarted })) as {
		roomId: string;
		isStarted: boolean;
	};
}
