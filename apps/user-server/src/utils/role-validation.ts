import { RequestHandler } from "express";
import { match } from "path-to-regexp";
import { ResInterface } from "src/interfaces/res";

const AllowPath = {
	Admin: [],
	User: ["/static/(.*)", "/user/info", "/map/list"],
	Ignore: ["/upload/avatar", "/user/login", "/user/get-code-state", "/user/get-login-code"],
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
	if (isIgnore(path)) {
		next();
	} else {
		//@ts-ignore
		const { isAdmin } = req.auth as { isAdmin: boolean; userId: string; iat: number; exp: number };
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
};
