import { buildTestPendingMapNotice, type PendingMapNotice } from "#src/utils/map-review-webhook";

/**
 * 飞书消息卡片（采用经典卡片 JSON，自定义机器人与自建应用两种通道都稳定支持；
 * 按钮仅做「打开链接」，不做卡片回调）
 */
export interface FeishuCard {
	config: { wide_screen_mode: boolean };
	header: { template: string; title: { tag: "plain_text"; content: string } };
	elements: unknown[];
}

/** 卡片正文里描述/日志的最大长度，避免卡片过长 */
const MAX_TEXT_LENGTH = 220;

function truncate(text: string | null | undefined, max = MAX_TEXT_LENGTH) {
	if (!text || !text.trim()) return "（无）";
	const trimmed = text.trim();
	return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/** 入队时间按时区展示（服务器时区可能是 UTC，这里固定按国内时区渲染） */
function formatTime(date: Date | null): string {
	if (!date) return "历史数据";
	return new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}

/**
 * 新待审地图通知卡片
 * @param adminReviewUrl 「打开审核页」按钮地址（生效配置里已解析好）
 */
export function buildNewPendingMapCard(notice: PendingMapNotice, pendingCount: number, adminReviewUrl: string): FeishuCard {
	const creator = notice.creatorName
		? `${notice.creatorName}${notice.creatorAccount ? `（${notice.creatorAccount}）` : ""}`
		: "未知创作者";

	const versionLine = notice.isResubmit
		? `**版本：** 已发布 v${notice.version} → 待审 ${notice.pendingVersion || "未标注"}`
		: `**版本：** 待审 ${notice.pendingVersion || "未标注"}（首次上传）`;

	const summary = [
		`**地图名称：** ${notice.name}`,
		`**创作者：** ${creator}`,
		versionLine,
		`**提交时间：** ${formatTime(notice.reviewSubmittedAt)}`,
		`**当前待审：** ${pendingCount} 个`,
	].join("\n");

	const detail = [
		`**地图描述：** ${truncate(notice.description)}`,
		`**本次更新日志：** ${truncate(notice.pendingChangelog)}`,
	].join("\n");

	// 待审文件直链（飞书里可直接点击下载，便于快速核对）
	const fileLinks: string[] = [];
	if (notice.pendingUrl) fileLinks.push(`[.mmmap](${notice.pendingUrl})`);
	if (notice.pendingSourceUrl) fileLinks.push(`[.fpmap](${notice.pendingSourceUrl})`);
	if (notice.coverUrl) fileLinks.push(`[封面图](${notice.coverUrl})`);

	const elements: unknown[] = [
		{ tag: "div", text: { tag: "lark_md", content: summary } },
		{ tag: "hr" },
		{ tag: "div", text: { tag: "lark_md", content: detail } },
	];

	if (fileLinks.length > 0) {
		elements.push({ tag: "div", text: { tag: "lark_md", content: `**待审文件：** ${fileLinks.join("　")}` } });
	}

	elements.push({ tag: "note", elements: [{ tag: "plain_text", content: `地图 ID：${notice.mapId}` }] });

	elements.push({
		tag: "action",
		actions: [
			{
				tag: "button",
				text: { tag: "plain_text", content: "打开审核页" },
				type: "primary",
				url: adminReviewUrl,
			},
		],
	});

	return {
		config: { wide_screen_mode: true },
		header: {
			template: notice.isResubmit ? "yellow" : "orange",
			title: { tag: "plain_text", content: "有新的待审地图" },
		},
		elements,
	};
}

/** 「测试通知」用的示例卡片（管理端联调用） */
export function buildTestPendingMapCard(pendingCount: number, adminReviewUrl: string): FeishuCard {
	return buildNewPendingMapCard(buildTestPendingMapNotice(), pendingCount, adminReviewUrl);
}
