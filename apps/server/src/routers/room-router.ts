import { Router } from "express";
import { createRecord } from "../db/api/game-record";
import { ResInterface } from "../interfaces/res";
import { User } from "../interfaces/bace";

type RoomMapItem = {
	roomId: string;
	hostName: string;
	hostId: string;
	hostPeerId: string | null;
	createTime: number;
	deleteTime: number;
	lastHeartTime: number;
	isPrivate: boolean;
	isStarted: boolean;
};

export const roomRouter = Router();
const heartContinuationTimeMs = 60000; //1分钟的持续时间, 如果一分钟内没有发送心跳, 删除房间;
const roomMap = new Map<string, RoomMapItem>();

//删除房间定时器
setInterval(() => {
	Array.from(roomMap.entries()).forEach((room) => {
		if (room[1].deleteTime < Date.now()) {
			const roomItem = room[1];
			createRecord(roomItem.roomId, Date.now() - roomItem.createTime);
			roomMap.delete(room[0]);
		}
	});
}, heartContinuationTimeMs * 2); //仁慈的, 取消房间时间计时器翻倍

roomRouter.get("/join", async (req, res, next) => {
	const { roomId } = req.query as { roomId: string; hostName: string; hostId: string };
	if (roomId && roomId.length < 13) {
		if (roomMap.has(roomId)) {
			//有roomId的话
			const room = roomMap.get(roomId);
			if (room && room.hostPeerId !== null) {
				const resMsg: ResInterface = {
					status: 200,
					data: { hostPeerId: room.hostPeerId, needCreate: false },
				};
				res.status(resMsg.status).json(resMsg);
			} else {
				const resMsg: ResInterface = {
					status: 202,
					msg: "服务器正在与房主建立联系, 请稍后重试...",
				};
				res.status(resMsg.status).json(resMsg);
			}
		} else {
			//创建房间s
			roomMap.set(roomId, {
				roomId,
				hostName: "",
				hostId: "",
				hostPeerId: null,
				createTime: Date.now(),
				deleteTime: Date.now() + heartContinuationTimeMs,
				lastHeartTime: Date.now(),
				isPrivate: true,
				isStarted: false,
			});
			const resMsg: ResInterface = {
				status: 200,
				data: { hostPeerId: "", needCreate: true, deleteIntervalMs: heartContinuationTimeMs },
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 400,
			msg: "RoomId不符合标准",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

roomRouter.post("/emit-host", async (req, res, next) => {
	const { roomId, hostPeerId, hostName, hostId } = req.body as {
		roomId: string;
		hostPeerId: string;
		hostName: string;
		hostId: string;
	};
	if (roomId && hostPeerId && hostName && hostId) {
		if (roomMap.has(roomId)) {
			// roomMap.set(roomId, { roomId,hostPeerId, deleteTime: Date.now() + heartContinuationTimeMs });
			const item = roomMap.get(roomId) as RoomMapItem;
			item.hostPeerId = hostPeerId;
			item.hostName = hostName;
			item.hostId = hostId;
			item.deleteTime = Date.now() + heartContinuationTimeMs;

			const resMsg: ResInterface = {
				status: 200,
			};
			res.status(resMsg.status).json(resMsg);
		} else {
			const resMsg: ResInterface = {
				status: 400,
				msg: "RoomId不存在",
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 400,
			msg: "RoomId不符合标准",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

roomRouter.post("/delete", async (req, res, next) => {
	const { roomId } = req.query as { roomId: string };
	if (roomId) {
		if (roomMap.has(roomId)) roomMap.delete(roomId);
		const resMsg: ResInterface = {
			status: 200,
		};
		res.status(resMsg.status).json(resMsg);
	} else {
		const resMsg: ResInterface = {
			status: 400,
			msg: "RoomId不符合标准",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

roomRouter.get("/heart", async (req, res, next) => {
	const { roomId } = req.query as { roomId: string };
	const room = roomMap.get(roomId);
	if (room) {
		room.deleteTime += heartContinuationTimeMs;
		room.lastHeartTime = Date.now();
	}
	res.status(200).end();
});

roomRouter.get("/room-list", async (req, res, next) => {
	res.status(200).json({
		data: Array.from(roomMap.values()).map((r) => {
			return <RoomMapItem>{
				...r,
				hostPeerId: null,
			};
		}),
	});
});

roomRouter.get("/random-public-room", async (req, res, next) => {
	const roomArr = Array.from(roomMap.values()).filter((r) => !r.isPrivate && !r.isStarted);

	if (roomArr.length > 0) {
		function getRandomElement<T>(arr: Array<T>) {
			const randomIndex = Math.floor(Math.random() * arr.length);
			return arr[randomIndex];
		}
		res.status(200).json({ roomId: getRandomElement(roomArr).roomId });
	} else {
		res.status(200).json({ roomId: "" });
	}
});

roomRouter.post("/set-private", async (req, res, next) => {
	const { roomId, isPrivate } = req.body as { roomId: string; isPrivate: boolean };
	const room = roomMap.get(roomId);
	if (room) {
		room.isPrivate = isPrivate;
		res.status(200).json(<ResInterface>{
			status: 200,
			msg: room.isPrivate ? "现在房间只能通过输入ID进入啦" : "已将房间公开",
			data: { roomId: roomId, isPrivate: room.isPrivate },
		});
	} else {
		res.status(400).json(<ResInterface>{ status: 400, msg: "不存在的房间" });
	}
});

roomRouter.post("/set-started", async (req, res, next) => {
	const { roomId, isStarted } = req.body as { roomId: string; isStarted: boolean };
	const room = roomMap.get(roomId);
	if (room) {
		room.isStarted = isStarted;
		res.status(200).json(<ResInterface>{
			status: 200,
		});
	} else {
		res.status(400).json(<ResInterface>{ status: 400, msg: "不存在的房间" });
	}
});
