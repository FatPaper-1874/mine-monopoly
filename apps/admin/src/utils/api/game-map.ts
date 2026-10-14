import { _axios } from "@/utils/axios";
import type {
	ApiResponse,
	EffectiveNotifyConfig,
	GameMapInDb,
	GameMapStatus,
	MapReviewNotifySettingInDb,
	MapReviewNotifySettingInput,
} from "@mine-monopoly/types";

/** 通知设置响应：读取时带库里原始行，保存时只有生效配置 */
export interface NotifySettingResponse {
	saved: boolean;
	/** 保存接口不返回原始行（密钥无需回传） */
	setting?: MapReviewNotifySettingInDb | null;
	config: EffectiveNotifyConfig;
	updatedAt: string | null;
	updatedBy: string | null;
}

export const getNotifySetting = async () => {
	const res = await _axios.get<ApiResponse<NotifySettingResponse>>("/game-map/notify-setting");
	return res.data.data;
};

export const saveNotifySetting = async (payload: MapReviewNotifySettingInput) => {
	const res = await _axios.post<ApiResponse<NotifySettingResponse>>("/game-map/notify-setting", payload);
	return res.data.data;
};

/** 用当前表单内容发一条测试通知（不落库）；ok=false 时 message 为失败原因 */
export const testNotifySetting = async (channel: "webhook" | "feishu", payload: MapReviewNotifySettingInput) => {
	const res = await _axios.post<ApiResponse<{ ok: boolean; message: string }>>("/game-map/notify-setting/test", {
		channel,
		config: payload,
	});
	return res.data.data;
};

export const createGameMap = async (formData: FormData) => {
	const res = await _axios.post<ApiResponse<string>>("/game-map/create", formData);
	return res.data.data;
};

export const updateGameMap = async (formData: FormData) => {
	const res = await _axios.post<ApiResponse<string>>("/game-map/update", formData);
	return res.data.data;
};

export const setGameMapUse = async (id: string, use: boolean) => {
	const res = await _axios.post<ApiResponse<string>>("/game-map/set-use", { id, use });
	return res.data.data;
};

export const getGameMapList = async (page: number, size: number) => {
	const res = await _axios.get<ApiResponse<{ total: number; gameMapList: GameMapInDb[]; current: number }>>(
		"/game-map/list",
		{ params: { page, size } }
	);
	return res.data.data;
};

export const getAdminGameMapList = async (params: {
	page: number;
	size: number;
	creatorId?: string;
	status?: GameMapStatus | "all";
	/** "newest"：待审队列排序（最近入队在前，无入队时间的存量数据在最后） */
	sort?: "newest";
	/** 分页游标（ISO 时间）：固定队列快照，避免自动刷新时新提交把列表挤动造成跨页重复 */
	cursor?: string;
}) => {
	const res = await _axios.get<ApiResponse<{ total: number; gameMapList: GameMapInDb[]; current: number }>>(
		"/game-map/admin-list",
		{ params: { ...params, status: params.status === "all" ? undefined : params.status } }
	);
	return res.data.data;
};

/** 待审队列：全部 status=reviewing 的地图，按最近入队时间倒序；cursor 用于固定队列快照 */
export const getPendingGameMapList = async (page: number, size: number, cursor?: string) => {
	return await getAdminGameMapList({ page, size, status: "reviewing", sort: "newest", cursor });
};

export const reviewGameMap = async (params: {
	mapId: string;
	action: "approve" | "reject" | "offline" | "online" | "delete";
	reason?: string;
}) => {
	const res = await _axios.post<ApiResponse<GameMapInDb>>("/game-map/review", params);
	return res.data.data;
};

export const bindGameMapCreator = async (mapId: string, creatorId: string) => {
	const res = await _axios.post<ApiResponse<GameMapInDb>>("/game-map/bind-creator", { mapId, creatorId });
	return res.data.data;
};

export const deleteGameMap = async (id: string) => {
	const res = await _axios.delete<ApiResponse<string>>("/game-map/delete", { params: { id } });
	return res.data.data;
};

export const getGameMapInfo = async (id: string) => {
	const res = await _axios.get<ApiResponse<GameMapInDb>>("/game-map/info", { params: { id } });
	return res.data.data;
};