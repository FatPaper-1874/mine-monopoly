import { Router } from "express";
import { ResInterface } from "../interfaces/res";
import { createStreet } from "../db/api/street";
export const routerStreet = Router();

routerStreet.post("/create", async (req, res, next) => {
	const { name, increase, mapId } = req.body;
	if (name && increase && mapId) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await createStreet(name, increase, mapId),
				msg: "创建街道成功",
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				data: e,
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
