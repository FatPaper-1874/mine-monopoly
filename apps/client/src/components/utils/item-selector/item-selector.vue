<script setup lang="ts">
import { toRaw, reactive, Ref } from "vue";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

interface Prop {
	column: number;
	itemList: Array<any>;
	keyName: string;
	multiple: boolean;
	selectedKey: string | string[];
}

const props = defineProps<Prop>();

const emits = defineEmits(["select", "update:selectedKey"]);

const _selectedList = reactive<string[]>([]);

function handleItemClick(item: any) {
	const itemId = item[props.keyName];

	if (props.multiple) {
		if (_selectedList.includes(itemId)) {
			_selectedList.splice(
				_selectedList.findIndex((tempItem: any) => tempItem[props.keyName] === itemId),
				1
			);
		} else {
			_selectedList.push(itemId);
		}

		emits("select", toRaw(_selectedList));
		emits("update:selectedKey", toRaw(_selectedList));
	} else {
		_selectedList.splice(0, 1);
		_selectedList.push(itemId);
		emits("select", itemId);
		emits("update:selectedKey", itemId);
	}
}
</script>
<template>
	<div class="item-selector" :style="{ 'grid-template-columns': `repeat(${column}, ${100 / column}%)` }">
		<div class="items" v-for="item in itemList" :key="item[keyName]" @click="handleItemClick(item)">
			<div v-if="_selectedList.includes(item[keyName])" class="selected"><FontAwesomeIcon icon="circle-check" /></div>
			<slot name="item" v-bind="item"></slot>
		</div>
	</div>
</template>
<style lang="scss" scoped>
.item-selector {
	display: grid;

	& > .items {
		position: relative;
		margin: 10px 15px;

		& > .selected {
			position: absolute;
			display: flex;
			top: 0;
			right: 0;
			font-size: 2em;
			color: var(--color-second);
			background-color: #ffffff;
			border-radius: 1em;
			box-shadow: 0px 0px 0.8rem rgba(0, 0, 0, 0.12);
			border: 4px solid var();
			z-index: 1000;
		}
	}
}
</style>
