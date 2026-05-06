import jwt from "jsonwebtoken";
import {privateKey, publicKey} from "#src/utils/rsakey";

export const REFRESH_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;

type TokenType = "access" | "refresh";

interface TokenPayload {
    userId: string;
    isAdmin: boolean;
    exp: number;
    type: TokenType;
}

function signToken(userId: string, isAdmin: boolean, expire: number, type: TokenType): Promise<string> {
    return new Promise((resolve, reject) => {
        const expireTime = Date.now() + expire;
        const token = jwt.sign(
            {
                userId,
                isAdmin: isAdmin || false,
                exp: expireTime,
                type,
            },
            privateKey,
            {algorithm: "RS256"}
        );
        resolve(token);
    });
}

export function setToken(userId: string, isAdmin: boolean, expire: number): Promise<string> {
    return signToken(userId, isAdmin, expire, "access");
}

export function setRefreshToken(userId: string, isAdmin: boolean): Promise<string> {
    return signToken(userId, isAdmin, REFRESH_EXPIRE_MS, "refresh");
}

export function verToken(token: string, expectedType?: TokenType) {
    try {
        if (token.includes("Bearer")) {
            token = token.split(" ")[1];
        }
        const info = jwt.verify(token, publicKey, {algorithms: ["RS256"]}) as TokenPayload;
        if (expectedType && info.type !== expectedType) {
            throw Error("token类型错误");
        }
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
