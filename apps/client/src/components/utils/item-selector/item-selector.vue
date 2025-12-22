<script setup lang="ts">
import { toRaw } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import HtmlRenderer from "../ui-renderer/ui-renderer.vue";
import { useGameData } from "@src/store/game";

interface Prop {
	column: number;
	itemList: Array<any>;
	keyName: string;
	multiple: boolean;
	selectedKey: string[];
}

const props = defineProps<Prop>();

const emits = defineEmits(["select", "update:selectedKey"]);

const isItemSelected = (itemId: string): boolean => {
	const currentList = Array.isArray(props.selectedKey) ? props.selectedKey : [];
	return currentList.includes(itemId);
};

function handleItemClick(item: any) {
	const itemId: string = item[props.keyName];
	let currentList = (Array.isArray(props.selectedKey) ? [...toRaw(props.selectedKey)] : []) as string[];

	if (props.multiple) {
		const index = currentList.indexOf(itemId);
		if (index !== -1) {
			currentList.splice(index, 1);
		} else {
			currentList.push(itemId);
		}
	} else {
		if (currentList.includes(itemId)) {
			currentList = [];
		} else {
			currentList = [itemId];
		}
	}

	emits("select", currentList);
	emits("update:selectedKey", currentList);
}
</script>

<template>
	<div class="item-selector" :style="{ 'grid-template-columns': `repeat(${column}, 1fr)` }">
		<div
			class="items"
			v-for="item in itemList"
			:key="item[keyName]"
			@click="handleItemClick(item)"
			:class="{ 'is-selected': isItemSelected(item[keyName]) }"
		>
			<div v-if="isItemSelected(item[keyName])" class="selected">
				<FontAwesomeIcon icon="check" />
			</div>

			<div v-if="item.display" class="item-display-html">
				<html-renderer :schema="item.display" :context="useGameData().$state" />
			</div>

			<slot v-else name="item" v-bind="item"></slot>
		</div>
	</div>
</template>

<style lang="scss" scoped>
/* style 保持不变 */
.item-selector {
	display: grid;
	gap: 1.6rem;
	padding: 0.7rem;

	& > .items {
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		background-color: #ffffff;
		border-radius: 0.8rem;
		border: 0.2rem solid #e0e0e0;
		cursor: pointer;
		transition: all 0.3s ease-out;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		overflow: hidden;

		// 鼠标悬停效果
		&:hover {
			box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
			transform: translateY(-2px);
		}

		// 选中状态
		&.is-selected {
			border-color: var(--color-primary); // 主题色边框
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--color-primary); // 增加主题色外圈
		}

		// 选中图标角标
		& > .selected {
			position: absolute;
			top: 0.1rem;
			right: 0.1rem;
			max-width: 2rem;
			max-height: 2rem;
			height: calc(60%);
			aspect-ratio: 1;
			display: flex;
			align-items: center;
			justify-content: center;

			color: #ffffff;
			background-color: var(--color-primary); // 主题色背景
			border-radius: 50%; // 保持圆角一致性
			z-index: 10;
		}

		.item-display-html {
			width: 100%;
			height: 100%;
			display: flex;
			padding: 0.5rem;
			align-items: center;
			justify-content: center;
			text-align: center;
			box-sizing: border-box;

			// 防止注入的内容溢出
			:deep(img) {
				max-width: 100%;
				max-height: 100%;
			}
		}
	}
}
</style>
