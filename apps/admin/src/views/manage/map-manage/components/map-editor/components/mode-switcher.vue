<script setup lang="ts">
import { ref } from "vue";
import { OperationMode } from "../enum/OperationMode";
import { ElRadioGroup, ElRadioButton, ElTooltip } from "element-plus";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const props = withDefaults(defineProps<{ operationMode: OperationMode }>(), { operationMode: OperationMode.MOVE });
const emits = defineEmits(["update:operationMode"]);

const _operationMode = ref<OperationMode>(props.operationMode);

function onModeChange(newMode: any){
	emits("update:operationMode", newMode);
};
</script>

<template>
	<el-radio-group class="mode-selecter" v-model="_operationMode" @change="onModeChange">
		<el-radio-button :label="OperationMode.MOVE">
			<el-tooltip content="移动模式" placement="bottom">
				<FontAwesomeIcon class="icon" icon="up-down-left-right"></FontAwesomeIcon>
			</el-tooltip>
		</el-radio-button>

		<el-radio-button :label="OperationMode.SELECT">
			<el-tooltip content="选择模式" placement="bottom">
				<FontAwesomeIcon class="icon" icon="hand-pointer"></FontAwesomeIcon>
			</el-tooltip>
		</el-radio-button>

		<el-radio-button :label="OperationMode.CREATE">
			<el-tooltip content="新建模式" placement="bottom">
				<FontAwesomeIcon class="icon" icon="plus"></FontAwesomeIcon>
			</el-tooltip>
		</el-radio-button>
	</el-radio-group>
</template>

<style lang="scss" scoped>
.mode-selecter {
	.icon {
		outline: none;
	}
}
</style>
