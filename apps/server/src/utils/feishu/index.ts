import type { EffectiveNotifyConfig } from "@mine-monopoly/types";
import { buildNewPendingMapCard } from "#src/utils/feishu/cards";
import { feishuTransportFromConfig, sendFeishuCard } from "#src/utils/feishu/client";
import type { PendingMapNotice } from "#src/utils/map-review-webhook";
import { serverLog } from "#src/utils/logger";

/**
 * 飞书通知：有新地图进入待审队列时推送消息卡片。
 *
 * - 生效配置与待审计数由 `#src/utils/map-review-notify` 统一解析后传入，本函数不再查库
 * - fire-and-forget：调用方 `void ...`，永不抛出
 * - 卡片按钮只做「打开审核页」跳转（自定义机器人不支持卡片回调，本通知也不做双向交互）
 * - 派发失败的重试/日志见 `#src/utils/feishu/client`
 */
export async function notifyNewPendingMapToFeishu(
	notice: PendingMapNotice,
	config: EffectiveNotifyConfig,
	pendingCount: number
): Promise<void> {
	try {
		const transport = feishuTransportFromConfig(config.feishu);
		if (!transport) return;

		const result = await sendFeishuCard(buildNewPendingMapCard(notice, pendingCount, config.adminReviewUrl), transport);
		if (result.ok) serverLog(`飞书待审通知已发送（地图 ${notice.mapId}：${notice.name}）`);
	} catch (e: any) {
		// 兜底：构造卡片等环节出错也不能影响上传主流程
		serverLog(`飞书待审通知异常（地图 ${notice.mapId}）：${e?.message || e}`, "warn");
	}
}
