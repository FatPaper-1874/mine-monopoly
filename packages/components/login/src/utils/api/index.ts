import { _axios } from "../axios";
import { getEncryption } from "../index";
import { FPMessage } from "@fatpaper-monopoly/ui";

export const getUserInfo = async () => {
	const res = await _axios.get("/user/info");
	return res.data as { id: string; username: string; avatar: string; color: string };
};

export const getPublicKey = async () => {
	const res = await _axios.get("/user/public-key");
	const publicKey = (res.data as string) || "";
	localStorage.setItem("public-key", publicKey);
	return publicKey;
};

export const apiLogin = async (useraccount: string, password: string) => {
	const encryptionPassword = await getEncryption(password);
	if (encryptionPassword) {
		const res = (await _axios.post("/user/login", {
			useraccount,
			password: encryptionPassword,
		})) as any;
		return res.data;
	} else {
		FPMessage({ type: "error", message: "密码加密异常" });
	}
};

export const apiRegister = async (formData: FormData) => {
	const res = await _axios.post("/user/register", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
	return res.status === 200 ? true : false;
};
