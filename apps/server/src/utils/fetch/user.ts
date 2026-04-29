import axios from "axios";
import { __USERSERVERHOST__ } from "#src/config/global";
import { UserInDB } from "#src/interfaces/bace";

export async function getUserByToken(token: string) {
	const res = await axios.get(`${__USERSERVERHOST__}/user/info`, { data: { token } });
	return res.data.data as UserInDB;
}
