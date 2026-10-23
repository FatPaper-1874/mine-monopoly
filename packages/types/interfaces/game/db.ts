/** 地图审核状态 */
export type GameMapStatus = "reviewing" | "published" | "rejected" | "offline";

/**
 * 地图更新日志条目（每个已发布版本一条，审核通过时固化）
 */
export interface GameMapChangelogEntry {
	/** 已发布版本号（审核通过时 version+1 后的值） */
	version: number;

	/** 作者提交的语义化版本，可能为 null */
	semver: string | null;

	/** 日志内容（Markdown） */
	content: string;

	/** 固化时间（ISO 字符串） */
	createdAt: string;
}

/**
 * 数据库游戏地图接口
 * 表示存储在数据库中的游戏地图
 */
export interface GameMapInDb {
	/** 地图唯一标识 */
	id: string;

	/** 地图名称 */
	name: string;

	/** 地图作者 */
	author: string;

	/** 已发布版本号（审核通过时递增） */
	version: number;

	/** 地图描述 */
	description: string;

	/** 待审核版本的更新日志（作者本次上传时填写，审核通过后固化进 changelog） */
	pendingChangelog: string | null;

	/** 已发布版本的更新日志历史（按版本升序，审核通过时追加），列表/详情查询时附带解析后的数组 */
	changelog: GameMapChangelogEntry[];

	/** 地图哈希值 */
	hash: string;

	/** 封面图片 URL */
	coverUrl: string;

	/** 当前公开生效地图数据 URL */
	mapUrl: string;

	/** 是否正在使用 */
	inuse: boolean;

	/** 上传用户 ID；存量/管理员上传为 null */
	creatorId: string | null;

	/** 创作者用户名（列表查询时附带，未绑定时为 null） */
	creatorName?: string | null;

	/** 创作者账号（列表查询时附带，未绑定时为 null） */
	creatorAccount?: string | null;

	/** 是否官方地图（管理员直建或创作者为管理员），列表/详情查询时附带 */
	isOfficial?: boolean;

	/** 审核状态 */
	status: GameMapStatus;

	/** 驳回原因 */
	rejectReason: string | null;

	/** 待审核地图数据 URL */
	pendingUrl: string | null;

	/** 待审核版本的地图源文件（.fpmap）URL，与 pendingUrl 配对 */
	pendingSourceUrl: string | null;

	/** 当前公开版本的地图源文件（.fpmap）URL，与 mapUrl 配对 */
	sourceUrl: string | null;

	/** 待审核地图哈希 */
	pendingHash: string | null;

	/** 作者提交的语义化版本 */
	pendingVersion: string | null;

	/**
	 * 最近一次进入审核队列的时间（重新提交会覆盖，审核通过/驳回后保留）
	 * 客户端本地加载的地图没有该信息，故为可选字段
	 */
	reviewSubmittedAt?: Date | null;
}

export interface MapKeyInDb {
	id: string;
	userId: string;
	key: string;
	revokedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface AdminAuditLogInDb {
	id: string;
	adminId: string | null;
	targetUserId: string | null;
	action: string;
	detail: string | null;
	createdAt: Date;
}

/**
 * 待审地图通知配置（单行记录，**只在管理端「待审查地图」页配置**，不走 .env）
 * 未保存过时两个通道都不发送通知
 */
export interface MapReviewNotifySettingInDb {
	id: string;
	/** 通用 webhook 接收地址 */
	webhookUrl: string | null;
	/** 通用 webhook 签名密钥（HMAC-SHA256） */
	webhookSecret: string | null;
	/** 飞书通道形态：bot = 群自定义机器人，app = 自建应用 */
	feishuMode: string | null;
	/** 飞书群自定义机器人 webhook 地址 */
	feishuBotWebhookUrl: string | null;
	/** 自定义机器人开启「签名校验」时的密钥 */
	feishuBotSecret: string | null;
	/** 飞书自建应用 App ID */
	feishuAppId: string | null;
	/** 飞书自建应用 App Secret */
	feishuAppSecret: string | null;
	/** 自建应用接收方 ID（chat_id / open_id / user_id / email） */
	feishuReceiveId: string | null;
	/** 接收方 ID 类型，默认 chat_id */
	feishuReceiveIdType: string | null;
	/** 卡片「打开审核页」按钮地址覆盖 */
	feishuAdminReviewUrl: string | null;
	updatedAt: Date;
	updatedBy: string | null;
}

/** 通用 webhook 生效配置 */
export interface NotifyWebhookConfig {
	url: string;
	secret: string;
}

/** 飞书生效配置：mode=bot 用机器人 webhook，mode=app 用自建应用 */
export interface NotifyFeishuConfig {
	mode: "bot" | "app";
	botWebhookUrl: string;
	botSecret: string;
	appId: string;
	appSecret: string;
	receiveId: string;
	receiveIdType: string;
}

/** 生效中的通知配置（仅来自管理端保存的配置；未配置过时两个通道均为 null） */
export interface EffectiveNotifyConfig {
	/** null 表示该通道未启用 */
	webhook: NotifyWebhookConfig | null;
	/** null 表示该通道未启用 */
	feishu: NotifyFeishuConfig | null;
	/** 卡片「打开审核页」按钮地址（已按配置或部署环境推导） */
	adminReviewUrl: string;
}

/**
 * 管理端提交的通知设置（表单形态）
 *
 * 保存与「发送测试通知」共用同一份结构：空串/null/未提供都按「未配置」处理，
 * 地址类字段会被服务端校验为 http(s) 绝对地址。
 */
export interface MapReviewNotifySettingInput {
	webhook?: {
		url?: string | null;
		/** 签名密钥（HMAC-SHA256） */
		secret?: string | null;
	} | null;
	feishu?: {
		/** bot = 群自定义机器人，app = 自建应用，其他值按「关闭」处理 */
		mode?: string | null;
		botWebhookUrl?: string | null;
		botSecret?: string | null;
		appId?: string | null;
		appSecret?: string | null;
		receiveId?: string | null;
		/** 默认 chat_id */
		receiveIdType?: string | null;
	} | null;
	/** 卡片「打开审核页」按钮地址覆盖；留空则按部署环境推导 */
	adminReviewUrl?: string | null;
}