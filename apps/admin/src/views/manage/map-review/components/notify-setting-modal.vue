<script setup lang="ts">
import { ref, watch } from "vue";
import { message } from "ant-design-vue";
import type { MapReviewNotifySettingInput } from "@mine-monopoly/types";
import { getNotifySetting, saveNotifySetting, testNotifySetting } from "@/utils/api/game-map";
import { formatSubmitTime } from "@/utils";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(["update:open", "saved"]);

interface TestResult {
	ok: boolean;
	message: string;
}

const loading = ref(false);
const saving = ref(false);
const testing = ref<"webhook" | "feishu" | null>(null);
/** 是否已在管理端保存过配置 */
const saved = ref(false);
const updatedAt = ref<string | null>(null);
/** 服务端推导出的审核页地址（表单留空时生效） */
const derivedAdminReviewUrl = ref("");
const webhookTestResult = ref<TestResult | null>(null);
const feishuTestResult = ref<TestResult | null>(null);

const webhookUrl = ref("");
const webhookSecret = ref("");
const feishuMode = ref<"off" | "bot" | "app">("off");
const botWebhookUrl = ref("");
const botSecret = ref("");
const appId = ref("");
const appSecret = ref("");
const receiveId = ref("");
const receiveIdType = ref("chat_id");
const adminReviewUrl = ref("");

const feishuModeOptions = [
	{ label: "关闭", value: "off" },
	{ label: "群自定义机器人（推荐）", value: "bot" },
	{ label: "自建应用（可私聊）", value: "app" },
];

const receiveIdTypeOptions = [
	{ label: "chat_id（群）", value: "chat_id" },
	{ label: "open_id（用户）", value: "open_id" },
	{ label: "user_id（用户）", value: "user_id" },
	{ label: "email（用户）", value: "email" },
];

function buildPayload(): MapReviewNotifySettingInput {
	return {
		webhook: { url: webhookUrl.value, secret: webhookSecret.value },
		feishu: {
			mode: feishuMode.value === "off" ? null : feishuMode.value,
			botWebhookUrl: botWebhookUrl.value,
			botSecret: botSecret.value,
			appId: appId.value,
			appSecret: appSecret.value,
			receiveId: receiveId.value,
			receiveIdType: receiveIdType.value,
		},
		adminReviewUrl: adminReviewUrl.value,
	};
}

async function loadSetting() {
	loading.value = true;
	webhookTestResult.value = null;
	feishuTestResult.value = null;
	try {
		const data = await getNotifySetting();
		saved.value = data.saved;
		updatedAt.value = data.updatedAt;
		derivedAdminReviewUrl.value = data.config.adminReviewUrl;

		const setting = data.setting;
		webhookUrl.value = setting?.webhookUrl ?? "";
		webhookSecret.value = setting?.webhookSecret ?? "";
		feishuMode.value = setting?.feishuMode === "bot" ? "bot" : setting?.feishuMode === "app" ? "app" : "off";
		botWebhookUrl.value = setting?.feishuBotWebhookUrl ?? "";
		botSecret.value = setting?.feishuBotSecret ?? "";
		appId.value = setting?.feishuAppId ?? "";
		appSecret.value = setting?.feishuAppSecret ?? "";
		receiveId.value = setting?.feishuReceiveId ?? "";
		receiveIdType.value = setting?.feishuReceiveIdType || "chat_id";
		adminReviewUrl.value = setting?.feishuAdminReviewUrl ?? "";
	} finally {
		loading.value = false;
	}
}

watch(
	() => props.open,
	(open) => {
		if (open) loadSetting();
	}
);

function close() {
	emit("update:open", false);
}

async function handleSave() {
	saving.value = true;
	try {
		await saveNotifySetting(buildPayload());
		emit("saved");
		close();
	} finally {
		saving.value = false;
	}
}

async function handleTest(channel: "webhook" | "feishu") {
	const target = channel === "webhook" ? webhookTestResult : feishuTestResult;
	target.value = null;
	testing.value = channel;
	try {
		const result = await testNotifySetting(channel, buildPayload());
		target.value = result;
		if (result.ok) message.success("测试通知已发送，请到接收端确认");
	} catch (e: any) {
		target.value = { ok: false, message: e?.response?.data?.msg || e?.message || "发送失败" };
	} finally {
		testing.value = null;
	}
}
</script>

<template>
	<a-modal
		:open="props.open"
		title="待审地图通知设置"
		:width="'min(780px, 96vw)'"
		:footer="null"
		destroy-on-close
		@cancel="close"
	>
		<a-spin :spinning="loading">
			<div class="notify-setting">
				<div class="hint">
					<div>配置保存在数据库，保存后立即生效；未配置的通知通道会被跳过。</div>
					<div>「发送测试通知」使用当前表单内容，<b>不需要先保存</b>，失败时会直接显示原因。</div>
					<div v-if="!saved" class="warn">当前尚未配置任何通知通道：新地图提交审核时不会发送通知。</div>
					<div v-else class="saved-line">上次保存：{{ formatSubmitTime(updatedAt, "-") }}</div>
				</div>

				<h4>通用 Webhook</h4>
				<div class="field">
					<span class="label">接收地址</span>
					<a-input v-model:value="webhookUrl" placeholder="https://notify.example.com/hooks/map-review" allow-clear />
				</div>
				<div class="field">
					<span class="label">签名密钥</span>
					<a-input v-model:value="webhookSecret" placeholder="可选：配置后请求带 X-Webhook-Signature" allow-clear />
				</div>
				<div class="field">
					<span class="label"></span>
					<a-space align="center">
						<a-button size="small" :loading="testing === 'webhook'" @click="handleTest('webhook')">发送测试通知</a-button>
						<span v-if="webhookTestResult" class="test-result" :class="webhookTestResult.ok ? 'ok' : 'fail'">
							{{ webhookTestResult.ok ? "发送成功" : `失败：${webhookTestResult.message}` }}
						</span>
					</a-space>
				</div>

				<a-divider />

				<h4>飞书通知</h4>
				<div class="field">
					<span class="label">通道</span>
					<a-select v-model:value="feishuMode" :options="feishuModeOptions" style="width: 260px" />
				</div>
				<template v-if="feishuMode === 'bot'">
					<div class="field">
						<span class="label">机器人 Webhook</span>
						<a-input v-model:value="botWebhookUrl" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." allow-clear />
					</div>
					<div class="field">
						<span class="label">签名密钥</span>
						<a-input v-model:value="botSecret" placeholder="机器人开启「签名校验」时填写" allow-clear />
					</div>
				</template>
				<template v-if="feishuMode === 'app'">
					<div class="field">
						<span class="label">App ID</span>
						<a-input v-model:value="appId" placeholder="cli_xxxxxxxx" allow-clear />
					</div>
					<div class="field">
						<span class="label">App Secret</span>
						<a-input v-model:value="appSecret" allow-clear />
					</div>
					<div class="field">
						<span class="label">接收方 ID</span>
						<a-input v-model:value="receiveId" placeholder="oc_xxx（群）/ ou_xxx / 邮箱" allow-clear />
					</div>
					<div class="field">
						<span class="label">接收方类型</span>
						<a-select v-model:value="receiveIdType" :options="receiveIdTypeOptions" style="width: 260px" />
					</div>
				</template>
				<div class="field">
					<span class="label"></span>
					<a-space align="center">
						<a-button
							size="small"
							:disabled="feishuMode === 'off'"
							:loading="testing === 'feishu'"
							@click="handleTest('feishu')"
						>
							发送测试通知
						</a-button>
						<span v-if="feishuTestResult" class="test-result" :class="feishuTestResult.ok ? 'ok' : 'fail'">
							{{ feishuTestResult.ok ? "发送成功" : `失败：${feishuTestResult.message}` }}
						</span>
					</a-space>
				</div>

				<a-divider />

				<h4>卡片按钮地址</h4>
				<div class="field">
					<span class="label">审核页地址</span>
					<a-input v-model:value="adminReviewUrl" :placeholder="derivedAdminReviewUrl" allow-clear />
				</div>
				<div class="field">
					<span class="label"></span>
					<span class="muted">留空则使用推导地址：{{ derivedAdminReviewUrl }}</span>
				</div>

				<div class="footer">
					<a-space>
						<a-button @click="close">取消</a-button>
						<a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
					</a-space>
				</div>
			</div>
		</a-spin>
	</a-modal>
</template>

<style lang="scss" scoped>
.notify-setting {
	h4 {
		margin: 0 0 12px;
		font-weight: bold;
		color: #333;
	}

	.hint {
		background-color: #fafafa;
		border-radius: 4px;
		padding: 8px 12px;
		margin-bottom: 16px;
		font-size: 12px;
		color: #666;
		display: flex;
		flex-direction: column;
		gap: 4px;

		.warn {
			color: #d4380d;
		}
	}

	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;

		.label {
			width: 110px;
			flex-shrink: 0;
			color: #888;
			font-size: 13px;
		}
	}

	.test-result {
		font-size: 12px;
		word-break: break-all;

		&.ok {
			color: #52c41a;
		}

		&.fail {
			color: #ff4d4f;
		}
	}

	.muted {
		font-size: 12px;
		color: #999;
		word-break: break-all;
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 20px;
		padding-top: 12px;
		border-top: 1px solid #f0f0f0;
	}
}
</style>
