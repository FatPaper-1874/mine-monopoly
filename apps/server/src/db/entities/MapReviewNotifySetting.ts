import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { MapReviewNotifySettingInDb } from "@mine-monopoly/types";

/**
 * 待审地图通知配置（单行记录，只在管理端「待审查地图」页配置，**不走 .env**）
 * 未保存过时两个通知通道都不发送通知。
 */
@Entity()
export class MapReviewNotifySetting implements MapReviewNotifySettingInDb {
	@PrimaryColumn({ type: "varchar", length: 32 })
	id: string;

	@Column({ type: "varchar", length: 500, nullable: true })
	webhookUrl: string | null;

	@Column({ type: "varchar", length: 200, nullable: true })
	webhookSecret: string | null;

	/** 飞书通道形态：bot = 群自定义机器人，app = 自建应用 */
	@Column({ type: "varchar", length: 8, nullable: true })
	feishuMode: string | null;

	@Column({ type: "varchar", length: 500, nullable: true })
	feishuBotWebhookUrl: string | null;

	@Column({ type: "varchar", length: 200, nullable: true })
	feishuBotSecret: string | null;

	@Column({ type: "varchar", length: 200, nullable: true })
	feishuAppId: string | null;

	@Column({ type: "varchar", length: 500, nullable: true })
	feishuAppSecret: string | null;

	@Column({ type: "varchar", length: 200, nullable: true })
	feishuReceiveId: string | null;

	@Column({ type: "varchar", length: 32, nullable: true })
	feishuReceiveIdType: string | null;

	@Column({ type: "varchar", length: 500, nullable: true })
	feishuAdminReviewUrl: string | null;

	@UpdateDateColumn()
	updatedAt: Date;

	@Column({ type: "varchar", length: 36, nullable: true })
	updatedBy: string | null;
}
