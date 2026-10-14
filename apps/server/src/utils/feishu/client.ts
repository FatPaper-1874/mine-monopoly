import axios from "axios";
import crypto from "crypto";
import { env } from "@mine-monopoly/env";
import type { NotifyFeishuConfig } from "@mine-monopoly/types";
import { clean } from "#src/utils/notify-config";
import { serverLog } from "#src/utils/logger";
import { resolveAttempts, runWithRetry } from "#src/utils/retry";

/** 单次请求超时（毫秒） */
const FEISHU_TIMEOUT_MS = 5000;
/** token 提前刷新时间：飞书 tenant_access_token 有效期 2 小时 */
const TOKEN_REFRESH_AHEAD_MS = 5 * 60 * 1000;
/** 飞书「token 无效/过期」类错误码，命中后清缓存以便下次重新获取 */
const INVALID_TOKEN_CODES = [99991663, 99991661, 99991664, 19001];

export type FeishuTransport =
	| { kind: "webhook"; url: string; secret?: string }
	| { kind: "app"; appId: string; appSecret: string; receiveId: string; receiveIdType: string };

export interface SendResult {
	ok: boolean;
	/** 失败原因（HTTP 状态码 / 飞书错误码 / 网络错误），成功时为空串 */
	message: string;
}

/** token 缓存按 appId 区分：管理端换了应用后不能复用旧 token */
let tokenCache: { appId: string; token: string; expiresAt: number } | null = null;

/** 飞书 OpenAPI 根地址；仅本地联调时可指向假服务，正常不用配置 */
function apiBase() {
	return env("FEISHU_API_BASE", "https://open.feishu.cn").replace(/\/+$/, "");
}

/**
 * 自定义机器人「签名校验」用的签名值。
 * 飞书要求：stringToSign = `${timestamp}\n${secret}`，以 stringToSign 为 HMAC-SHA256 的 key、
 * 空内容计算摘要后 base64 编码，并把 timestamp 与 sign 一起放进请求体。
 */
export function signCustomBotRequest(timestamp: string, secret: string): string {
	return crypto.createHmac("sha256", `${timestamp}\n${secret}`).update("").digest("base64");
}

/** 由管理端配置构造发送通道；返回 null 表示该通道未启用 */
export function feishuTransportFromConfig(config: NotifyFeishuConfig | null | undefined): FeishuTransport | null {
	if (!config) return null;

	if (config.mode === "bot") {
		const url = clean(config.botWebhookUrl);
		if (!url) return null;
		const secret = clean(config.botSecret);
		return { kind: "webhook", url, secret: secret || undefined };
	}

	const appId = clean(config.appId);
	const appSecret = clean(config.appSecret);
	const receiveId = clean(config.receiveId);
	if (!appId || !appSecret || !receiveId) return null;
	return {
		kind: "app",
		appId,
		appSecret,
		receiveId,
		receiveIdType: clean(config.receiveIdType) || "chat_id",
	};
}

/** 飞书接口均为 HTTP 200 + body.code === 0 才算成功（旧版接口用 StatusCode） */
function describeFailure(data: any): string {
	if (!data || typeof data !== "object") return "响应不是 JSON";
	if (data.code === 0 || data.StatusCode === 0) return "";
	const code = data.code ?? data.StatusCode;
	const message = data.msg ?? data.StatusMessage ?? "unknown";
	return `code=${code} msg=${message}`;
}

function isInvalidToken(data: any) {
	const code = Number(data?.code ?? data?.StatusCode);
	return INVALID_TOKEN_CODES.includes(code);
}

async function getTenantAccessToken(appId: string, appSecret: string): Promise<string> {
	if (tokenCache && tokenCache.appId === appId && tokenCache.expiresAt > Date.now()) return tokenCache.token;

	const res = await axios.post(
		`${apiBase()}/open-apis/auth/v3/tenant_access_token/internal`,
		{ app_id: appId, app_secret: appSecret },
		{ timeout: FEISHU_TIMEOUT_MS }
	);
	const failure = describeFailure(res.data);
	if (failure) throw new Error(`获取 tenant_access_token 失败：${failure}`);

	const expireSeconds = Number(res.data?.expire ?? 0);
	tokenCache = {
		appId,
		token: res.data.tenant_access_token,
		// 提前 5 分钟刷新，至少缓存 1 分钟，避免异常 expire 值导致疯狂取 token
		expiresAt: Date.now() + Math.max(expireSeconds * 1000 - TOKEN_REFRESH_AHEAD_MS, 60_000),
	};
	return tokenCache.token;
}

/**
 * 发送消息卡片。永不抛出；失败返回 { ok: false, message }（管理端「测试发送」直接展示该原因）。
 * @param attempts 尝试次数，默认按重试表全量重试；测试发送传 1 以便立即拿到结果
 */
export async function sendFeishuCard(
	card: unknown,
	transport: FeishuTransport,
	options?: { attempts?: number }
): Promise<SendResult> {
	const label = transport.kind === "webhook" ? "自定义机器人" : "自建应用";
	let lastError = "";

	const result = await runWithRetry(
		async () => {
			const failure =
				transport.kind === "webhook"
					? await sendViaCustomBot(card, transport)
					: await sendViaApp(card, transport);
			if (failure) throw new Error(failure);
		},
		{
			attempts: options?.attempts,
			onError: ({ attempt, maxAttempts, error }) => {
				lastError = error;
				serverLog(`飞书通知派发失败（${label}，第 ${attempt}/${maxAttempts} 次）：${error}`, "warn");
			},
		}
	);
	if (result !== null) return { ok: true, message: "" };

	if (resolveAttempts(options?.attempts) > 1) {
		serverLog(`飞书通知放弃派发：${lastError}`, "error");
	}
	return { ok: false, message: lastError };
}

/** 群自定义机器人：开启「签名校验」时必须带 timestamp + sign。返回失败原因，成功返回空串 */
async function sendViaCustomBot(card: unknown, transport: Extract<FeishuTransport, { kind: "webhook" }>) {
	const body: Record<string, unknown> = { msg_type: "interactive", card };
	if (transport.secret) {
		const timestamp = Math.floor(Date.now() / 1000).toString();
		body.timestamp = timestamp;
		body.sign = signCustomBotRequest(timestamp, transport.secret);
	}
	const res = await axios.post(transport.url, body, { timeout: FEISHU_TIMEOUT_MS });
	return describeFailure(res.data);
}

/** 自建应用：先取 tenant_access_token 再发消息。返回失败原因，成功返回空串 */
async function sendViaApp(card: unknown, transport: Extract<FeishuTransport, { kind: "app" }>) {
	const token = await getTenantAccessToken(transport.appId, transport.appSecret);
	const res = await axios.post(
		`${apiBase()}/open-apis/im/v1/messages`,
		{ receive_id: transport.receiveId, msg_type: "interactive", content: JSON.stringify(card) },
		{
			headers: { Authorization: `Bearer ${token}` },
			params: { receive_id_type: transport.receiveIdType },
			timeout: FEISHU_TIMEOUT_MS,
		}
	);
	const failure = describeFailure(res.data);
	// token 失效时清缓存，下次派发重新获取
	if (failure && isInvalidToken(res.data)) tokenCache = null;
	return failure;
}
