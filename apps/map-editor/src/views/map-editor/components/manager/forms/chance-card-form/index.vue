<script setup lang="ts">
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "./editor-lib.d.ts?raw";
import templateText from "./template-text?raw";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useMapDataStore, useResourceStore } from "@src/stores";
import { message } from "ant-design-vue";
import { ChanceCardInfo, TargetSelectType } from "@mine-monopoly/types";
import { addNewImage, convertToFpUrl } from "@src/utils/file";
import { Rule } from "ant-design-vue/es/form";
import ChanceCardPreview from "@src/views/map-editor/components/common/chance-card-preview.vue";

const props = defineProps<{ chanceCard: ChanceCardInfo | undefined }>();
const emits = defineEmits(["close"]);

onMounted(async () => {
	if (!props.chanceCard) return;
	const imageResource = useResourceStore().findImageById(props.chanceCard.iconId);
	if (!imageResource) {
		message.error(`获取 ${props.chanceCard.name} 的icon资源失败`, 1);
		return;
	}
	iconUrl.value = imageResource.url;
});

const targetNameMap: Record<TargetSelectType, string> = {
	[TargetSelectType.ToSelf]: "对自己生效",
	[TargetSelectType.ToOtherPlayer]: "对其他玩家生效",
	[TargetSelectType.ToPlayer]: "对玩家生效",
	[TargetSelectType.ToProperty]: "对地产生效",
	[TargetSelectType.ToMapItem]: "对格子生效",
};

const targetTypeMap: Record<TargetSelectType, string> = {
	[TargetSelectType.ToSelf]: "IPlayer",
	[TargetSelectType.ToOtherPlayer]: "IPlayer",
	[TargetSelectType.ToPlayer]: "IPlayer",
	[TargetSelectType.ToProperty]: "IProperty",
	[TargetSelectType.ToMapItem]: "string",
};

function getInitForm() {
	const initForm = {
		id: crypto.randomUUID(),
		name: "",
		color: "",
		description: "",
		type: TargetSelectType.ToSelf,
		effectCode: "",
		iconId: "",
	};
	return initForm;
}

const iconUrl = ref("");

const chanceCardForm = reactive<ChanceCardInfo>(props.chanceCard || getInitForm());

watch(
	() => chanceCardForm.type,
	(newType, oldType) => {
		if (!oldType) return;
		chanceCardForm.effectCode = chanceCardForm.effectCode.replace(
			`target: ${targetTypeMap[oldType]}`,
			`target: ${targetTypeMap[newType]}`,
		);
	},
	{ immediate: true },
);

let isIconChange = false;

async function handleAddChanceCard() {
	try {
		const mapDataStore = useMapDataStore();
		if (isIconChange) {
			if (chanceCardForm.iconId) useResourceStore().removeImage(chanceCardForm.iconId);
			const iconId = await addNewImage(iconUrl.value, chanceCardForm.name);
			chanceCardForm.iconId = iconId;
		}
		if (props.chanceCard) {
			mapDataStore.editChanceCard(chanceCardForm);
			message.success(`修改 "${chanceCardForm.name}" 成功`);
		} else {
			mapDataStore.addChanceCard(chanceCardForm);
			message.success(`添加 "${chanceCardForm.name}" 成功`);
		}
		emits("close");
	} catch (e: any) {
		message.error(e.message, 1);
	}
}

async function handleAddIcon() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "icon图片", extensions: ["png", "jpg", "jpeg", "gif"] }],
		properties: ["openFile"],
	});
	if (res.filePaths.length > 0) {
		iconUrl.value = convertToFpUrl(res.filePaths[0]); // 直接拿路径
		isIconChange = true;
	}
}

const chanceCardIconPreview = computed(() => {
	return iconUrl.value;
});

const iconRule = async (_rule: Rule, value: string) => {
	if (!iconUrl.value) {
		return Promise.reject("请选择图片");
	} else {
		return Promise.resolve();
	}
};
</script>

<template>
	<div class="chance-card-form-container">
		<div class="chance-card-form">
			<chance-card-preview
				class="chance-card-preview"
				:chance-card="chanceCardForm"
				:disable="false"
				:icon-preview="chanceCardIconPreview"
			/>
			<a-form @finish="handleAddChanceCard" :model="chanceCardForm" name="map-event" autocomplete="off">
				<a-form-item label="ID">
					<a-alert size="small" style="word-break: break-all" :message="chanceCardForm.id" type="info" />
				</a-form-item>
				<a-form-item label="机会卡名称" name="name" :rules="[{ required: true, message: '请输入机会卡名称' }]">
					<a-input v-model:value="chanceCardForm.name" />
				</a-form-item>
				<a-form-item label="机会卡描述" name="description" :rules="[{ required: true, message: '请输入机会卡描述' }]">
					<a-textarea v-model:value="chanceCardForm.description" :auto-size="{ minRows: 3, maxRows: 5 }" />
					<a-typography-paragraph type="secondary" style="font-size: 12px; margin-top: 4px;">
						支持 \n 进行换行
					</a-typography-paragraph>
				</a-form-item>
				<a-form-item label="机会卡类型" name="type" :rules="[{ required: true, message: '请选择机会卡目标类型' }]">
					<a-select v-model:value="chanceCardForm.type">
						<a-select-option v-for="(value, key) in targetNameMap" :value="key" :key="key">
							{{ value }}
						</a-select-option>
					</a-select>
				</a-form-item>
				<a-form-item label="颜色" name="color" :rules="[{ required: true, message: '请输入机会卡颜色' }]">
					<input type="color" v-model="chanceCardForm.color" />
				</a-form-item>
				<a-form-item label="icon图片" name="iconUrl" :rules="[{ required: true, validator: iconRule }]">
					<a-button size="small" @click="handleAddIcon">选择图片</a-button>
				</a-form-item>
				<a-form-item>
					<a-button style="width: 100%" type="primary" html-type="submit">确认修改</a-button>
				</a-form-item>
			</a-form>
		</div>

		<div class="editor-container">
			<span class="title">
				<a-alert
					message="在下面编辑器编写触发代码，游戏进行到响应的触发时机会直接执行下面全部的代码"
					type="info"
					show-icon
				/>
			</span>
			<code-editor
				v-model="chanceCardForm.effectCode"
				:template-text="templateText"
				:static-types="libContent"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.chance-card-form-container {
	display: flex;
	height: 75vh;

	.chance-card-form {
		width: 25vw;
		display: flex;
		flex-direction: column;
		overflow-y: scroll;
		padding-right: 10px;
		align-items: center;

		.chance-card-preview {
			margin: 10px 0;
		}
	}

	.editor-container {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding: 0 10px;
		gap: 10px;
	}

	.icon-url {
		display: block;
		word-break: break-all;
		margin-bottom: 10px;
		padding: 5px;
		border: 1px solid #ccc;
		border-radius: 5px;
		background-color: #f3f3f3;
		font-size: 0.8em;
	}
	.icon-preview {
		display: block;
		margin-bottom: 10px;
		border-radius: 10px;
		width: 150px;
		height: 150px;
		border-radius: 5px;
		background-color: #f3f3f3;
	}
}
</style>
