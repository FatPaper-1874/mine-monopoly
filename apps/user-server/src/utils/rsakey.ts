import crypto from "crypto";

export const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
	modulusLength: 2048, // 密钥长度，通常使用2048位或更多
	publicKeyEncoding: {
		type: "spki",
		format: "pem",
	},
	privateKeyEncoding: {
		type: "pkcs8",
		format: "pem",
	},
});
