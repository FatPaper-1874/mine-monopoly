import { Router } from "express";
import { ResInterface } from "../interfaces/res";
import {
	createItemType,
	deleteItemTypes,
	updateItemType,
} from "../db/api/item-type";

export const routerItemType = Router();

routerItemType.post("/create", async (req, res, next) => {
	const { name, color, size, modelId, mapId } = req.body;
	if (name && color && modelId && size) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				msg: `创建类型${name}成功`,
				data: await createItemType(name, color, size, modelId, mapId),
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e) {
			const resMsg: ResInterface = {
				status: 500,
				msg: e as string,
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 500,
			msg: "请求的参数错误",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

// routerItemType.post("/create-event", async (req, res, next) => {
// 	const { name, color, size, modelId } = req.body;
// 	if (name && color && modelId && size) {
// 		try {
// 			const resMsg: ResInterface = {
// 				status: 200,
// 				msg: '创建类型"name"成功',
// 				data: await createEventItemType(name, color, size, modelId),
// 			};
// 			res.status(resMsg.status).json(resMsg);
// 		} catch (e) {
// 			const resMsg: ResInterface = {
// 				status: 500,
// 				msg: e as string,
// 			};
// 			res.status(resMsg.status).json(resMsg);
// 		}
// 	} else {
// 		const resMsg: ResInterface = {
// 			status: 500,
// 			msg: "请求的参数错误",
// 		};
// 		res.status(resMsg.status).json(resMsg);
// 	}
// });

routerItemType.post("/update", async (req, res, next) => {
	const { id, name, color, size, modelId, effectCode } = req.body;
	if (id && name && color && modelId && size) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				msg: `更新类型"${name}"成功`,
				data: await updateItemType(id, name, color, size, modelId, effectCode),
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e) {
			const resMsg: ResInterface = {
				status: 500,
				msg: e as string,
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 500,
			msg: "请求的参数错误",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

routerItemType.delete("/delete", async (req, res, next) => {
	const { id } = req.query;
	if (id) {
		try {
			await deleteItemTypes(id.toString());
			const resMsg: ResInterface = {
				status: 200,
				msg: "删除成功",
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

// routerItemType.get("/list", async (req, res, next) => {
// 	const { page = 1, size = 8 } = req.query;
// 	try {
// 		const { eventItemtypesList, total } = await getEventItemTypesList(
// 			parseInt(page.toString()),
// 			parseInt(size.toString())
// 		);
// 		const resMsg: ResInterface = {
// 			status: 200,
// 			data: { total, current: parseInt(page.toString()), eventItemtypesList },
// 		};
// 		res.status(resMsg.status).json(resMsg);
// 	} catch (e: any) {
// 		const resMsg: ResInterface = {
// 			status: 500,
// 			msg: `获取特殊ItemType列表失败, ${e.message}`,
// 		};
// 		res.status(resMsg.status).json(resMsg);
// 	}
// });

// routerItemType.get("/info", async (req, res, next) => {
// 	const id = req.query.id as string;
// 	if (id) {
// 		try {
// 			const resMsg: ResInterface = {
// 				status: 200,
// 				data: await getItemTypeById(id),
// 			};
// 			res.status(resMsg.status).json(resMsg);
// 		} catch {}
// 	} else {
// 		const resMsg: ResInterface = {
// 			status: 500,
// 			msg: "获取特殊ItemType信息失败, 无效的id",
// 		};
// 		res.status(resMsg.status).json(resMsg);
// 	}
// });
