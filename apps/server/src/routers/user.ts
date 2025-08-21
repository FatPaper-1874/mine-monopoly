import { Router } from "express";
import { roleValidation } from "../utils/role-validation";
import { ResInterface } from "../interfaces/res";
import { verToken } from "../utils/token";

export const routerUser = Router();

routerUser.get("/is-admin", async (req, res, next) => {
	const token = req.headers.authorization;
	if (!token) {
		const resContent: ResInterface = {
			status: 401,
			msg: "没有携带token",
		};
		res.status(401).json(resContent);
		return;
	}
	const tokenInfo = await verToken(token);
	if (!tokenInfo) {
		const resContent: ResInterface = {
			status: 401,
			msg: "token解析失败",
		};
		res.status(401).json(resContent);
		return;
	}
	const isAdmin = tokenInfo.isAdmin;
	if (isAdmin) {
		const resContent: ResInterface = {
			status: 200,
			data: { isAdmin: true },
		};
		res.status(200).json(resContent);
	} else {
		const resContent: ResInterface = {
			status: 403,
			msg: "你不是管理员喔",
		};
		res.status(403).json(resContent);
	}
});
