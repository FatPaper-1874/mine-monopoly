<script setup lang="ts">
import { toRaw, watch, ref } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const props = defineProps({
	itemList: { type: Array<any>, default: [] },
	selectedKeyList: { type: Array<string>, default: [] },
	keyName: { type: String, default: "id", require: true },
});
const emit = defineEmits<{ (e: "select", selectedList: string[]): void }>();

const _dataKeylist = ref<{ isSelected: boolean; [key: string]: any }[]>([]);

function handleItemToggleSelected(item: any) {
	const index = _dataKeylist.value.findIndex((_item) => _item[props.keyName] == item[props.keyName]);
	_dataKeylist.value[index].isSelected = !_dataKeylist.value[index].isSelected;
	emit("select", toRaw(_dataKeylist.value.filter((_item) => _item.isSelected).map((_item) => _item[props.keyName])));
}

watch(
	() => props.itemList,
	(newList) => {
		_dataKeylist.value = newList.map((item) => {
			item["isSelected"] = Boolean(props.selectedKeyList.find((_item) => _item == item.id));
			return item;
		});
	}
);
</script>

<template>
	<div class="item-selector">
		<div class="items" @click="handleItemToggleSelected(item)" v-for="item in _dataKeylist" :key="item[keyName]">
			<div v-if="item.isSelected" class="selected">
				<FontAwesomeIcon icon="circle-check" />
			</div>
			<slot name="item" v-bind="item"></slot>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.item-selector {
	display: flex;
	flex-wrap: wrap;

	& > .items {
		position: relative;
		margin: 10px 15px;

		& > .selected {
			position: absolute;
			display: flex;
			top: 0;
			right: 0;
			font-size: 2em;
			color: #409eff;
			border-radius: 1em;
			box-shadow: 0px 0px 12px rgba(0, 0, 0, 0.12);
		}
	}
}
</style>
