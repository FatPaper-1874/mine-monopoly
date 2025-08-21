import jwt from "jsonwebtoken";
import {privateKey, publicKey} from "../rsakey";


export function setToken(userId: string, isAdmin: boolean, expire: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const expireTime = Date.now() + expire;
        const token = jwt.sign(
            {
                userId,
                isAdmin: isAdmin || false,
                exp: expireTime,
            },
            privateKey,
            {algorithm: "RS256"}
        );
        resolve(token);
    });
}

export function verToken(token: string) {
    try {
        if (token.includes("Bearer")) {
            token = token.split(" ")[1];
        }
        const info = jwt.verify(token, publicKey, {algorithms: ["RS256"]}) as {
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
