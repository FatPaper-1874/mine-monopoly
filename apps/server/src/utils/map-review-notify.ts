import type { MapReviewNotifySettingInput } from "@mine-monopoly/types";
import { countReviewingMaps } from "#src/db/api/game-map";
import { getEffectiveNotifyConfig } from "#src/db/api/map-review-notify-setting";
import { notifyNewPendingMapToFeishu } from "#src/utils/feishu";
import { buildTestPendingMapCard } from "#src/utils/feishu/cards";
import { feishuTransportFromConfig, sendFeishuCard } from "#src/utils/feishu/client";
import {
	buildTestWebhookPayload,
	sendPendingMapWebhook,
	sendWebhookPayload,
	type PendingMapNotice,
} from "#src/utils/map-review-webhook";
import { serverLog } from "#src/utils/logger";
import { badRequest, notifySettingDraft, resolveEffectiveNotifyConfig } from "#src/utils/notify-config";

const FEISHU_INCOMPLETE_MESSAGE =
	"飞书通道未配置完整：群自定义机器人需要 Webhook 地址；自建应用需要 App ID、App Secret 与接收方 ID";

/**
 * 新地图进入待审队列时的通知编排。
 *
 * 两个通道都从**同一份**生效配置与**同一次**待审计数出发，避免每个通道各自查库；
 * 全部为 fire-and-forget：调用方 `void notifyPendingMapSubmitted(notice)`，
 * 本函数永不抛出，失败只写日志，不影响上传响应。
 */
export async function notifyPendingMapSubmitted(notice: PendingMapNotice): Promise<void> {
	try {
		const config = await getEffectiveNotifyConfig();
		if (!config.webhook && !config.feishu) return;

		const pendingCount = await countReviewingMaps();
		await Promise.allSettled([
			config.webhook ? sendPendingMapWebhook(notice, config.webhook, pendingCount) : Promise.resolve(),
			config.feishu ? notifyNewPendingMapToFeishu(notice, config, pendingCount) : Promise.resolve(),
		]);
	} catch (e: any) {
		// 兜底：取配置/统计等环节出错也不能影响上传主流程
		serverLog(`待审地图通知异常（地图 ${notice.mapId}）：${e?.message || e}`, "warn");
	}
}

/**
 * 管理端「发送测试通知」：用当前表单内容发一条（不落库、单次尝试，便于立刻看到失败原因）。
 * 只解析一次配置、只查一次待审数；通道未配置完整时抛 400。
 */
export async function sendTestNotification(
	channel: "webhook" | "feishu",
	input: MapReviewNotifySettingInput
): Promise<{ ok: boolean; message: string }> {
	const effective = resolveEffectiveNotifyConfig(notifySettingDraft(input));
	const pendingCount = await countReviewingMaps();

	if (channel === "feishu") {
		const transport = feishuTransportFromConfig(effective.feishu);
		if (!transport) throw badRequest(FEISHU_INCOMPLETE_MESSAGE);
		return await sendFeishuCard(buildTestPendingMapCard(pendingCount, effective.adminReviewUrl), transport, {
			attempts: 1,
		});
	}

	if (!effective.webhook) throw badRequest("请先填写通用 Webhook 地址");
	return await sendWebhookPayload(
		effective.webhook.url,
		buildTestWebhookPayload(pendingCount),
		effective.webhook.secret,
		{ attempts: 1 }
	);
}
