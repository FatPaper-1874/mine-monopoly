import crypto from "crypto";
import axios from "axios";
import type { NotifyWebhookConfig } from "@mine-monopoly/types";
import { serverLog } from "#src/utils/logger";
import { runWithRetry } from "#src/utils/retry";

/** 单次请求超时（毫秒） */
const WEBHOOK_TIMEOUT_MS = 5000;

export const MAP_REVIEW_WEBHOOK_EVENT = "map.review.submitted";

/** 触发 webhook 的待审地图信息（由上传流程提供） */
export interface PendingMapNotice {
	mapId: string;
	name: string;
	author: string;
	description: string;
	/** 当前已发布版本号（首次上传时为 0） */
	version: number;
	creatorId: string | null;
	creatorName: string | null;
	creatorAccount: string | null;
	pendingVersion: string | null;
	pendingChangelog: string | null;
	reviewSubmittedAt: Date | null;
	coverUrl: string;
	pendingUrl: string | null;
	pendingSourceUrl: string | null;
	/** true 表示已存在地图的重新提交（首次上传为 false） */
	isResubmit: boolean;
}

export interface MapReviewWebhookPayload {
	event: typeof MAP_REVIEW_WEBHOOK_EVENT;
	/** 派发时间（ISO），接收方可据此判断时效 */
	occurredAt: string;
	/** 当前待审地图总数（含本次，供通知文案使用） */
	pendingCount: number;
	map: {
		id: string;
		name: string;
		author: string;
		description: string;
		version: number;
		creatorId: string | null;
		creatorName: string | null;
		creatorAccount: string | null;
		pendingVersion: string | null;
		pendingChangelog: string | null;
		reviewSubmittedAt: string | null;
		coverUrl: string;
		pendingUrl: string | null;
		pendingSourceUrl: string | null;
		isResubmit: boolean;
		status: "reviewing";
	};
}

/** 「测试通知」用的示例数据（管理端联调用） */
export function buildTestPendingMapNotice(): PendingMapNotice {
	return {
		mapId: "test-map-id",
		name: "【测试】待审地图通知",
		author: "系统",
		description: "这是管理端「通知设置」里点「发送测试通知」触发的示例通知，收到即表示配置可用。",
		version: 1,
		creatorId: null,
		creatorName: "测试创作者",
		creatorAccount: "test_account",
		pendingVersion: "1.0.0",
		pendingChangelog: "无",
		reviewSubmittedAt: new Date(),
		coverUrl: "",
		pendingUrl: null,
		pendingSourceUrl: null,
		isResubmit: true,
	};
}

function buildPayload(notice: PendingMapNotice, pendingCount: number): MapReviewWebhookPayload {
	return {
		event: MAP_REVIEW_WEBHOOK_EVENT,
		occurredAt: new Date().toISOString(),
		pendingCount,
		map: {
			id: notice.mapId,
			name: notice.name,
			author: notice.author,
			description: notice.description,
			version: notice.version,
			creatorId: notice.creatorId,
			creatorName: notice.creatorName,
			creatorAccount: notice.creatorAccount,
			pendingVersion: notice.pendingVersion,
			pendingChangelog: notice.pendingChangelog,
			reviewSubmittedAt: notice.reviewSubmittedAt ? notice.reviewSubmittedAt.toISOString() : null,
			coverUrl: notice.coverUrl,
			pendingUrl: notice.pendingUrl,
			pendingSourceUrl: notice.pendingSourceUrl,
			isResubmit: notice.isResubmit,
			status: "reviewing",
		},
	};
}

/** 「测试通知」用的示例报文（管理端联调用） */
export function buildTestWebhookPayload(pendingCount: number): MapReviewWebhookPayload {
	return buildPayload(buildTestPendingMapNotice(), pendingCount);
}

/** 计算请求体签名：X-Webhook-Signature: sha256=<hmac-sha256(body, secret)> */
function signBody(body: string, secret: string) {
	return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

export interface SendWebhookResult {
	ok: boolean;
	/** 失败原因（HTTP 状态码 / 网络错误），成功时为空串 */
	message: string;
}

/**
 * 发送一次（或按重试表多次）webhook，永不抛出。
 * 管理端「测试发送」用 attempts: 1 以便立即拿到失败原因。
 */
export async function sendWebhookPayload(
	url: string,
	payload: MapReviewWebhookPayload,
	secret: string,
	options?: { attempts?: number }
): Promise<SendWebhookResult> {
	// 手动序列化：签名与请求体必须是同一份字节
	const body = JSON.stringify(payload);
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"X-Webhook-Event": payload.event,
	};
	if (secret) headers["X-Webhook-Signature"] = signBody(body, secret);

	let lastError = "";
	const result = await runWithRetry(
		async () => {
			await axios.post(url, body, { headers, timeout: WEBHOOK_TIMEOUT_MS });
		},
		{
			attempts: options?.attempts,
			onError: ({ attempt, maxAttempts, error }) => {
				lastError = error;
				serverLog(
					`新待审地图 webhook 派发失败（第 ${attempt}/${maxAttempts} 次，地图 ${payload.map.id}）：${error}`,
					"warn"
				);
			},
		}
	);
	if (result !== null) return { ok: true, message: "" };

	if (options?.attempts === undefined) {
		serverLog(`新待审地图 webhook 放弃派发（地图 ${payload.map.id}）：${lastError}`, "error");
	}
	return { ok: false, message: lastError };
}

/**
 * 通用 webhook 派发入口：有新地图进入待审队列时推送。
 *
 * - 由 `#src/utils/map-review-notify` 统一编排（配置与待审计数只解析/查询一次）
 * - fire-and-forget：调用方 `void ...`，永不抛出，失败只记日志，不影响上传响应
 * - 失败重试见 `#src/utils/retry`；未做持久化队列，长时间故障会丢失该次通知
 */
export async function sendPendingMapWebhook(
	notice: PendingMapNotice,
	config: NotifyWebhookConfig,
	pendingCount: number
): Promise<void> {
	try {
		await sendWebhookPayload(config.url, buildPayload(notice, pendingCount), config.secret);
	} catch (e: any) {
		// 兜底：序列化等环节出错也不能影响上传主流程
		serverLog(`新待审地图 webhook 异常（地图 ${notice.mapId}）：${e?.message || e}`, "warn");
	}
}
