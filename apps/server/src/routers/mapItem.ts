import { Router } from "express";
import { ResInterface } from "../interfaces/res";
import { createMapItem, deleteMapItem, linkMapItem } from "../db/api/mapItem";
export const routerMapItem = Router();

routerMapItem.post("/create", async (req, res, next) => {
	const { _id, x, y, rotation, typeId, mapId } = req.body;
	if (_id && x && y && rotation !== undefined && typeId && mapId) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await createMapItem(_id, x, y, rotation, typeId, mapId),
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				msg: e.message,
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 500,
			msg: "参数错误",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

routerMapItem.delete("/delete", async (req, res, next) => {
	const { id } = req.query;
	if (id) {
		try {
			await deleteMapItem(id.toString());
			const resMsg: ResInterface = {
				status: 200,
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e) {
			const resMsg: ResInterface = {
				status: 500,
				msg: "数据库请求错误",
			};
			res.status(resMsg.status).json(resMsg);
		}
	}
});

routerMapItem.post("/link", async (req, res, next) => {
	const { sourceId, targetId } = req.body;
	if (sourceId && targetId) {
		try {
			await linkMapItem(sourceId.toString(), targetId.toString());
			const resMsg: ResInterface = {
				status: 200,
				msg: "连接MapItem成功",
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				msg: e.toString(),
			};
			res.status(resMsg.status).json(resMsg);
		}
	}
});
