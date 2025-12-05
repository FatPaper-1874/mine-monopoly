<script setup lang="ts">
import { ref, VNode, isVNode } from "vue";
import FpDialog from "../fp-dialog/fp-dialog.vue";
import { UISchema } from "@fatpaper-monopoly/types";
import UiRenderer from "../ui-renderer/ui-renderer.vue";
import { useGameData } from "@src/store/game";

export interface Props {
	title?: string;
	content?: string | VNode | UISchema;
	confirmText?: string;
	cancelText?: string;
	showCancel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	title: "提示",
	confirmText: "确认",
	cancelText: "",
});

const emits = defineEmits(["confirm", "cancel", "close"]);

const visible = ref(false);

const open = () => {
	visible.value = true;
};

defineExpose({ open });

const handleConfirm = () => {
	emits("confirm");
	visible.value = false;
};

const handleCancel = () => {
	emits("cancel");
	visible.value = false;
};

const handleDialogClose = () => {
	emits("close");
};
</script>

<template>
	<FpDialog
		v-model:visible="visible"
		:title="title"
		:hidden-footer="true"
		:append-to-body="true"
		style="min-width: 26rem; max-width: 90vw"
		@cancel="handleDialogClose"
	>
		<div class="message-content">
			<component v-if="isVNode(content)" :is="content" />
			<div v-else-if="typeof content === 'string'" v-html="content"></div>
			<UiRenderer v-else :context="useGameData().$state" :schema="content as UISchema" />
		</div>

		<div class="message-footer">
			<button v-if="cancelText" class="btn-cancel" @click="handleCancel">
				{{ cancelText }}
			</button>

			<button class="btn-confirm" @click="handleConfirm">
				{{ confirmText }}
			</button>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.message-content {
	padding: 10px 0 20px 0;
	font-size: 1rem;
	color: var(--color-text-regular, #333);
	line-height: 1.5;
}

.message-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	margin-top: 10px;

	button {
		padding: 0.5em 1.2em;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		border: none;
		transition: filter 0.2s;

		&.btn-confirm {
			background-color: var(--color-second);
			color: white;

			&:hover {
				filter: brightness(0.9);
			}
		}

		&.btn-cancel {
			border: 1px solid #b0b1b3;
			background-color: #f5f7fa;
			color: var(--color-third);
			border-color: var(--color-third);
			text-shadow: none;

			&:hover {
				filter: brightness(0.95);
			}
		}
	}
}
</style>
