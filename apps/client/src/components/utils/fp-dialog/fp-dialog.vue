<script setup lang="ts">
import { ref } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const { visible, submitDisable } = defineProps({
	visible: { type: Boolean, default: false },
	submitDisable: { type: Boolean, default: false },
	style: { type: String, default: "" },
});

const emits = defineEmits(["update:visible", "submit", "cancel"]);

function handleSumbit() {
	emits("submit");
	emits("update:visible", false);
}

function closeDialog() {
	emits("cancel");
	emits("update:visible", false);
}
</script>

<template>
	<div class="fp-dialog" v-show="visible">
		<div class="fp-dialog-modal" @click.self="closeDialog"></div>

		<!-- 主体 -->
		<div class="fp-dialog-main" :style="style" v-if="visible">
			<div class="fp-dialog-header">
				<div class="title">
					<slot name="title"></slot>
				</div>
				<button class="close-button" @click="closeDialog">
					<FontAwesomeIcon icon="close"></FontAwesomeIcon>
				</button>
			</div>

			<!-- 内容区 -->
			<div class="fp-dialog-body">
				<slot></slot>
			</div>

			<div class="fp-dialog-footer">
				<button :disabled="submitDisable" @click="handleSumbit">确认</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.fp-dialog {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 9999999;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: 0.3s;
	pointer-events: initial;
	box-sizing: border-box;

	.fp-dialog-modal {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		background-color: rgba(0, 0, 0, 0.3);
	}

	.fp-dialog-main {
		transition: 0.3s;
		min-width: 30em;
		min-height: 20em;
		max-height: 80vh;
		background-color: #fff;
		position: relative;
		border-radius: 10px;
		box-shadow: var(--box-shadow);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.fp-dialog-header {
		background-color: var(--color-third);
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-shadow: var(--box-shadow);
		padding: 0.3rem 0.6rem;
		// position: relative;

		& > .title {
			color: var(--color-text-white);
		}

		& > .close-button {
			// position: absolute;
			// right: 0;
			width: 1.6em;
			height: 1.6em;
			font-size: 1.2em;
			border-radius: 50%;
			box-sizing: border-box;
			text-align: center;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.fp-dialog-body {
		flex: 1;
		padding: 0.8em;
		background-color: var(--color-bg-light);
		overflow-y: scroll;
	}

	.fp-dialog-footer {
		text-align: right;
		padding: 0.6em;
		background-color: var(--color-bg-light);
		box-shadow: var(--box-shadow);

		& > button {
			padding: 0.4em 0.8em;
			border-radius: 10px;
			font-size: 1.3em;
		}
	}
}
</style>
