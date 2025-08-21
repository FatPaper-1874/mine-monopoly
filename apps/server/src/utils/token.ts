import jwt from "jsonwebtoken";
import { getPublicKey } from "./api/keys";

export async function verToken(token: string) {
	try {
		if (token.includes("Bearer")) {
			token = token.split(" ")[1];
		}
		const info = jwt.verify(token, await getPublicKey(), { algorithms: ["RS256"] }) as {
			userId: string;
			isAdmin: boolean;
			exp: number;
		};
		return info;
	} catch (err: any) {
		if (err) {
			if (err.name === "TokenExpiredError") {
				throw Error("token过期");
			} else if (err.name === "UnauthorizedError") {
				throw Error("token无效");
			}
		}
	}
}
