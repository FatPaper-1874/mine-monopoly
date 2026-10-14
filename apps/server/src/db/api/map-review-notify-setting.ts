import type { MapReviewNotifySettingInDb, MapReviewNotifySettingInput } from "@mine-monopoly/types";
import { AppDataSource } from "#src/db/dbConnecter";
import { MapReviewNotifySetting } from "#src/db/entities/MapReviewNotifySetting";
import { resolveEffectiveNotifyConfig, settingFieldsFromInput } from "#src/utils/notify-config";

/** 单行配置的固定主键 */
const NOTIFY_SETTING_ID = "default";

const notifySettingRepository = AppDataSource.getRepository(MapReviewNotifySetting);

export const getNotifySetting = async (): Promise<MapReviewNotifySetting | null> => {
	return await notifySettingRepository.findOne({ where: { id: NOTIFY_SETTING_ID } });
};

/** 生效配置（完全来自管理端保存的配置；未保存过时两个通道都为空） */
export const getEffectiveNotifyConfig = async () => {
	return resolveEffectiveNotifyConfig(await getNotifySetting());
};

/** 保存（upsert）通知配置；空串一律落库为 null（表示该字段未配置） */
export const saveNotifySetting = async (input: MapReviewNotifySettingInput, adminId: string | null) => {
	const existing = await getNotifySetting();
	const entity = existing ?? Object.assign(new MapReviewNotifySetting(), { id: NOTIFY_SETTING_ID });

	Object.assign(entity, settingFieldsFromInput(input));
	entity.updatedBy = adminId;

	return await notifySettingRepository.save(entity);
};

const AUDIT_FIELDS: Array<keyof MapReviewNotifySettingInDb> = [
	"webhookUrl",
	"webhookSecret",
	"feishuMode",
	"feishuBotWebhookUrl",
	"feishuBotSecret",
	"feishuAppId",
	"feishuAppSecret",
	"feishuReceiveId",
	"feishuReceiveIdType",
	"feishuAdminReviewUrl",
];

/** 审计用：列出发生变化的字段名（**不含任何密钥值**） */
export function diffNotifySettingFields(
	before: MapReviewNotifySettingInDb | null,
	after: MapReviewNotifySettingInDb
): string[] {
	const changed: string[] = [];
	for (const field of AUDIT_FIELDS) {
		const previous = before ? ((before[field] as string | null) ?? null) : null;
		const next = (after[field] as string | null) ?? null;
		if (previous !== next) changed.push(field);
	}
	return changed;
}
