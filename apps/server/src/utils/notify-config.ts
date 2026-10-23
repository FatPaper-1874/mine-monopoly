import { env } from "@mine-monopoly/env";
import type {
	EffectiveNotifyConfig,
	MapReviewNotifySettingInDb,
	MapReviewNotifySettingInput,
	NotifyFeishuConfig,
	NotifyWebhookConfig,
} from "@mine-monopoly/types";

/** 去除首尾空白；空串按「未配置」处理 */
export function clean(value: string | null | undefined): string {
	return (value ?? "").trim();
}

/** 提交内容 → 配置行字段（保存、审计比较、「测试通知」三处共用同一套空值语义） */
export function settingFieldsFromInput(input: MapReviewNotifySettingInput) {
	return {
		webhookUrl: clean(input.webhook?.url) || null,
		webhookSecret: clean(input.webhook?.secret) || null,
		feishuMode: input.feishu?.mode === "app" || input.feishu?.mode === "bot" ? input.feishu.mode : null,
		feishuBotWebhookUrl: clean(input.feishu?.botWebhookUrl) || null,
		feishuBotSecret: clean(input.feishu?.botSecret) || null,
		feishuAppId: clean(input.feishu?.appId) || null,
		feishuAppSecret: clean(input.feishu?.appSecret) || null,
		feishuReceiveId: clean(input.feishu?.receiveId) || null,
		feishuReceiveIdType: clean(input.feishu?.receiveIdType) || null,
		feishuAdminReviewUrl: clean(input.adminReviewUrl) || null,
	};
}

/**
 * 提交内容 → 一份临时配置行（不落库），供保存与「测试发送」共用。
 * 只带上解析配置真正需要的字段，避免中间态实体扩散到别处。
 */
export function notifySettingDraft(input: MapReviewNotifySettingInput): MapReviewNotifySettingInDb {
	return {
		id: "preview",
		...settingFieldsFromInput(input),
		updatedAt: new Date(),
		updatedBy: null,
	};
}

/**
 * 飞书卡片「打开审核页」按钮地址：优先用配置里的显式地址，否则按部署环境推导
 * （这里读的是部署相关变量，不是通知配置本身）
 */
export function resolveAdminReviewUrl(override?: string | null): string {
	const explicit = clean(override);
	if (explicit) return explicit;

	const protocol = env("PROTOCOL");
	const domain = env("MONOPOLY_DOMAIN");
	const adminPrefix = clean(env("ADMIN_BASE_PREFIX", "")) || clean(env("API_BASE_PREFIX", ""));
	if (adminPrefix) return `${protocol}://${domain}${adminPrefix}/map-review`;
	return `${protocol}://${domain}:${env<number>("MONOPOLY_ADMIN_PORT")}/map-review`;
}

/** bot 模式需要机器人 webhook 地址；app 模式需要 appId + appSecret + receiveId */
export function isFeishuConfigUsable(config: NotifyFeishuConfig | null | undefined): boolean {
	if (!config) return false;
	if (config.mode === "bot") return Boolean(clean(config.botWebhookUrl));
	return Boolean(clean(config.appId) && clean(config.appSecret) && clean(config.receiveId));
}

/** 由配置行构造飞书配置；返回 null 表示该通道未启用 */
export function feishuConfigFromSetting(setting: MapReviewNotifySettingInDb | null): NotifyFeishuConfig | null {
	if (!setting) return null;

	const botWebhookUrl = clean(setting.feishuBotWebhookUrl);
	const mode: "bot" | "app" =
		setting.feishuMode === "app" ? "app" : setting.feishuMode === "bot" ? "bot" : botWebhookUrl ? "bot" : "app";

	const config: NotifyFeishuConfig = {
		mode,
		botWebhookUrl,
		botSecret: clean(setting.feishuBotSecret),
		appId: clean(setting.feishuAppId),
		appSecret: clean(setting.feishuAppSecret),
		receiveId: clean(setting.feishuReceiveId),
		receiveIdType: clean(setting.feishuReceiveIdType) || "chat_id",
	};
	return isFeishuConfigUsable(config) ? config : null;
}

/** 由配置行构造通用 webhook 配置；返回 null 表示该通道未启用 */
export function webhookConfigFromSetting(setting: MapReviewNotifySettingInDb | null): NotifyWebhookConfig | null {
	if (!setting) return null;
	const url = clean(setting.webhookUrl);
	if (!url) return null;
	return { url, secret: clean(setting.webhookSecret) };
}

/** 生效配置（完全来自管理端保存的配置行；未保存过时两个通道都为空） */
export function resolveEffectiveNotifyConfig(setting: MapReviewNotifySettingInDb | null): EffectiveNotifyConfig {
	return {
		webhook: webhookConfigFromSetting(setting),
		feishu: feishuConfigFromSetting(setting),
		adminReviewUrl: resolveAdminReviewUrl(setting?.feishuAdminReviewUrl ?? null),
	};
}

/** 通知设置里所有需要填写地址的字段（校验与展示共用同一份定义） */
export const NOTIFY_URL_FIELDS: Array<{ label: string; get: (input: MapReviewNotifySettingInput) => string | null | undefined }> = [
	{ label: "通用 Webhook 地址", get: (input) => input.webhook?.url },
	{ label: "飞书机器人 Webhook 地址", get: (input) => input.feishu?.botWebhookUrl },
	{ label: "审核页地址", get: (input) => input.adminReviewUrl },
];

/**
 * 校验提交内容里的地址：非空时必须是 http(s) 绝对地址。
 * 不合法时抛出带 `statusCode = 400` 的错误，由路由直接作为 400 返回。
 */
export function validateNotifyConfigInput(input: MapReviewNotifySettingInput) {
	for (const { label, get } of NOTIFY_URL_FIELDS) {
		const trimmed = clean(get(input));
		if (!trimmed) continue;

		let parsed: URL;
		try {
			parsed = new URL(trimmed);
		} catch {
			throw badRequest(`${label}不是合法的 URL`);
		}
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			throw badRequest(`${label}必须以 http:// 或 https:// 开头`);
		}
	}
}

/** 参数校验类错误：带 statusCode 便于路由返回 400 */
export function badRequest(message: string) {
	const error = new Error(message) as Error & { statusCode: number };
	error.statusCode = 400;
	return error;
}
