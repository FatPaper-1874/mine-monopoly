<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import FpPopover from "@src/components/utils/fp-popover/fp-popover.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, ref } from "vue";

const version = computed(() => __APP_VERSION__);
const showRewardDialog = ref(false);
const rewardWxUrl = `${import.meta.env.BASE_URL}images/reward-qr-wx.png`;
const rewardAlipayUrl = `${import.meta.env.BASE_URL}images/reward-qr-alpay.jpg`;

function openExternalLink(url: string) {
	const electronApi = (window as any).electronAPI;
	if (electronApi?.openExternal) {
		void electronApi.openExternal(url);
		return;
	}

	window.open(url, "_blank", "noopener,noreferrer");
}

function openRewardDialog() {
	showRewardDialog.value = true;
}

function toAFD() {
	openExternalLink("https://afdian.com/a/fatpaper");
}

function toLog() {
	openExternalLink("https://fatpaper.site/archives/monopoly-log");
}

function toGithub() {
	openExternalLink("https://github.com/FatPaper-1874/fatpaper-monopoly");
}

function toIssues() {
	openExternalLink("https://www.wjx.top/vm/tjZANNP.aspx");
}

function toBilibili() {
	openExternalLink("https://www.bilibili.com/video/BV1mPHFedEH1");
}
</script>

<template>
	<div class="login-extra">
		<fp-popover placement="right" trigger="hover">
			<button @click="openRewardDialog" class="login-extra-item btn-small about">
				<FontAwesomeIcon icon="sack-dollar" />
			</button>
			<template #content>
				<div class="extra-content">给作者支持!</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<button @click="toLog" class="login-extra-item btn-small about">
				<FontAwesomeIcon icon="bullhorn" />
			</button>
			<template #content>
				<div class="extra-content">查看公告</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<button @click="toGithub" class="login-extra-item btn-small about">
				<FontAwesomeIcon icon="code" />
			</button>
			<template #content>
				<div class="extra-content">已开源！点击直达Github仓库</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<button @click="toIssues" class="login-extra-item btn-small bug">
				<FontAwesomeIcon icon="bug" />
			</button>
			<template #content>
				<div class="extra-content">有Bug? 点击提交</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<button @click="toBilibili" class="login-extra-item btn-small to-bilibili">Bili</button>
			<template #content>
				<div class="extra-content" style="color: #fb7299">点击看介绍视频</div>
			</template>
		</fp-popover>

		<span class="version">v{{ version }}</span>
	</div>

	<FpDialog
		v-model:visible="showRewardDialog"
		title="给作者支持"
		:hidden-footer="true"
		:style="{ width: 'min(50rem, 94vw)' }"
	>
		<div class="reward-dialog">
			<p class="reward-text">如果你觉得项目有帮助，可以直接扫码支持，也可以前往爱发电。</p>
			<div class="reward-qrs">
				<div class="reward-card">
					<img :src="rewardWxUrl" alt="微信收款码" class="reward-image" />
					<span class="reward-label">微信</span>
				</div>
				<div class="reward-card">
					<img :src="rewardAlipayUrl" alt="支付宝收款码" class="reward-image" />
					<span class="reward-label">支付宝</span>
				</div>
			</div>
			<button class="reward-link btn-small" @click="toAFD">前往爱发电</button>
		</div>
	</FpDialog>
</template>

<style scoped lang="scss">
.version {
	color: rgba(255, 255, 255, 0.85);
	margin-top: 1rem;
}
.login-extra {
	position: absolute;
	left: 2rem;
	bottom: 2rem;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	align-items: center;

	.login-extra-item {
		--btn-base-bg: var(--fp-color-bg-light);
		--btn-bg: var(--btn-base-bg);

		position: relative;
		width: 3.2rem;
		height: 3.2rem;
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0.5rem 0;
		font-size: 1.3rem;
		border-radius: 0.6rem;
		color: var(--fp-color-secondary);
		text-shadow: var(--fp-text-shadow);
		cursor: pointer;

		& svg {
			filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff);
		}

		&:hover {
			--btn-bg: var(--fp-color-secondary);
			color: #fff;
			text-shadow: var(--fp-text-shadow-pressed);

			& svg {
				filter: none;
			}
		}

		&:active {
			--btn-bg: color-mix(in srgb, var(--fp-color-secondary), black 20%);
			color: #fff;
			text-shadow: var(--fp-text-shadow-pressed);
		}

		// B站按钮独立配色
		&.to-bilibili {
			--btn-base-bg: #fb7299;
			--btn-bg: var(--btn-base-bg);

			color: #fff;
			text-shadow: 0.1rem 0.1rem 0 rgba(189, 67, 113, 0.5);
		}
	}

	.extra-content {
		font-size: 1.1rem;
		padding: 0.1rem 0.2rem;
		color: var(--fp-color-primary);
		text-shadow: var(--fp-text-shadow);
	}
}

.reward-dialog {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	align-items: center;
	padding-bottom: 0.4rem;
}

.reward-text {
	margin: 0;
	color: var(--fp-color-primary);
	text-align: center;
	line-height: 1.6;
}

.reward-qrs {
	width: 100%;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
}

.reward-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.6rem;
	padding: 0.9rem;
	border-radius: 0.9rem;
	background: rgba(255, 255, 255, 0.7);
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}

.reward-image {
	width: min(100%, 19rem);
	aspect-ratio: 1 / 1;
	object-fit: contain;
	border-radius: 0.75rem;
	background: #fff;
}

.reward-label {
	font-size: 1rem;
	color: var(--fp-color-secondary);
	text-shadow: var(--fp-text-shadow);
}

.reward-link {
	--btn-bg: #936ae4;
	min-width: 9rem;
}

@media (max-width: 768px) {
	.reward-qrs {
		grid-template-columns: 1fr;
	}
}
</style>
