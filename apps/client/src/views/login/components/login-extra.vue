<script setup lang="ts">
import FpPopover from "@src/components/utils/fp-popover/fp-popover.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

function toAFD() {
	window.open("https://afdian.com/a/fatpaper");
}

function toLog() {
	window.open("https://fatpaper.site/archives/monopoly-log");
}

function toGithub() {
	window.open("https://github.com/FatPaper-1874/fatpaper-monopoly");
}

function toIssues() {
	window.open("https://www.wjx.top/vm/tjZANNP.aspx");
}

function toBilibili() {
	window.open("https://www.bilibili.com/video/BV1mPHFedEH1");
}
</script>

<template>
	<div class="login-extra">
		<!-- <fp-popover placement="right" trigger="hover">
			<div @click="toAFD" class="login-extra-item about">
				<FontAwesomeIcon icon="sack-dollar" />
			</div>
			<template #content>
				<div class="extra-content">给作者支持!</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<div @click="toLog" class="login-extra-item about">
				<FontAwesomeIcon icon="bullhorn" />
			</div>
			<template #content>
				<div class="extra-content">查看公告</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<div @click="toGithub" class="login-extra-item about">
				<FontAwesomeIcon icon="code" />
			</div>
			<template #content>
				<div class="extra-content">已开源！点击直达Github仓库</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<div @click="toIssues" class="login-extra-item bug">
				<FontAwesomeIcon icon="bug" />
			</div>
			<template #content>
				<div class="extra-content">有Bug? 点击提交</div>
			</template>
		</fp-popover>
		<fp-popover placement="right" trigger="hover">
			<div @click="toBilibili" class="login-extra-item to-bilibili">Bili</div>
			<template #content>
				<div class="extra-content">点击看介绍视频</div>
			</template>
		</fp-popover> -->

		<span class="version">v0.1.2</span>
	</div>
</template>

<style scoped lang="scss">
.version {
	color: rgba(255, 255, 255, 0.85);
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
		width: 5rem;
		height: 5rem;
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0.7rem 0;
		background-color: rgba(255, 255, 255, 0.8);
		font-size: 2rem;
		border-radius: 0.7rem;
		color: var(--color-second);
		text-shadow: var(--text-shadow);
		cursor: pointer;
		box-shadow: var(--box-shadow);

		&.to-bilibili {
			color: #fb7299;
			text-shadow: 0.2rem 0.2rem 0.13rem #ffb9b3;
		}

		& svg {
			filter: drop-shadow(0.2rem 0.2rem 0.13rem rgba(0, 0, 0, 0.15));
		}
	}

	.extra-content {
		width: max-content;
		margin-left: 1rem;
		font-size: 1.2rem;
		background-color: rgba(255, 255, 255, 0.7);
		border-radius: 0.7rem;
		padding: 0.6rem;
		color: var(--color-primary);
		text-shadow: var(--text-shadow);
	}
}
</style>
