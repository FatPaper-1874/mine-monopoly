import { RequestHandler } from "express";
import { match } from "path-to-regexp";
import { ResInterface } from "src/interfaces/res";
import { verToken } from "./token";

const AllowPath = {
	Admin: [],
	User: ["/user/info"],
	Ignore: [
		"/upload/avatar",
		"/user/login",
		"/user/get-code-state",
		"/user/get-login-code",
		"/static/(.*)",
		"/music/list",
		"/role/list",
		"/map/list",
		"/map/info",
		"/room-router/join",
		"/room-router/emit-host",
		"/room-router/delete",
		"/room-router/heart",
		"/room-router/random-public-room",
		"/room-router/set-private",
		"/room-router/set-started"
	],
};

function isIgnore(path: string): boolean {
	return AllowPath.Ignore.some((allowPath) => {
		const pathMatcher = match(allowPath);
		return Boolean(pathMatcher(path));
	});
}

function isAllowPath(path: string): boolean {
	return AllowPath.User.some((allowPath) => {
		const pathMatcher = match(allowPath);
		return Boolean(pathMatcher(path));
	});
}

export const roleValidation: RequestHandler = async (req, res, next) => {
	const path = req.path;
	const token = req.headers.authorization;
	if (isIgnore(path)) {
		next();
	} else if (!token) {
		const resContent: ResInterface = {
			status: 401,
			msg: "没有携带token",
		};
		res.status(401).json(resContent);
	} else {
		const tokenInfo = await verToken(token);
		if (!tokenInfo) {
			const resContent: ResInterface = {
				status: 401,
				msg: "token过期，请重新登录",
			};
			res.status(401).json(resContent);
		} else {
			const { userId, isAdmin } = tokenInfo;

			if (!isAdmin && !isAllowPath(path)) {
				//当不是管理员又不是访问用户允许的路径时
				const resContent: ResInterface = {
					status: 403,
					msg: "无权访问该接口",
				};
				res.status(403).json(resContent);
			} else {
				next();
			}
		}
	}
};
