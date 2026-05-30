<script setup lang="ts">
import { GameMapInfo } from "@mine-monopoly/types";
import { ResourcePicker } from "@src/components/resource-picker";
import { useMapDataStore } from "@src/stores";
import { message } from "ant-design-vue";
import { Rule } from "ant-design-vue/es/form";
import { reactive, watch } from "vue";

const visible = defineModel({ default: false });

const mapInfoForm = reactive<GameMapInfo>({ ...useMapDataStore().info });

watch(
	() => visible,
	() => {
		Object.assign(mapInfoForm, useMapDataStore().info);
	},
	{ immediate: true },
);

async function handleUpdateInfo() {
	try {
		const mapDataStore = useMapDataStore();

		// 处理背景图片
		if (mapInfoForm.backgroundImageId !== mapDataStore.info.backgroundImageId) {
			mapDataStore.setBackgroundImageId(mapInfoForm.backgroundImageId);
		}

		// 处理封面图片
		if (mapInfoForm.coverImageId !== mapDataStore.info.coverImageId) {
			mapDataStore.setCoverImageId(mapInfoForm.coverImageId);
		}

		// 更新其他信息
		mapDataStore.updateMapInfo({
			name: mapInfoForm.name,
			author: mapInfoForm.author,
			version: mapInfoForm.version,
			description: mapInfoForm.description,
		});

		message.success(`更新地图信息成功`, 1);
	} catch (e: any) {
		message.error(e.message, 1);
	}

	handleClose();
	visible.value = false;
}

async function checkVersion(_rule: Rule, value: string) {
	if (!value) {
		return Promise.reject("请输入版本号");
	}
	const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
	if (!semverRegex.test(value)) {
		return Promise.reject(`请按照"数字.数字.数字"的格式定义版本号`);
	}
}

function handleClose() {
	// ResourcePicker manages its own state
}
</script>

<template>
	<a-modal
		destroyOnClose
		@cancel="handleClose"
		:footer="null"
		width="800px"
		v-model:open="visible"
		title="地图信息"
		wrap-class-name="fixed-map-info-modal"
		centered
	>
		<a-form
			@finish="handleUpdateInfo"
			:model="mapInfoForm"
			layout="vertical"
			name="basic"
			autocomplete="off"
			class="full-height-form"
		>
			<div class="form-body">
				<div class="left-col">
					<a-form-item label="地图名称" name="name" :rules="[{ required: true, message: '请输入地图名称' }]">
						<a-input v-model:value="mapInfoForm.name" placeholder="地图名称" />
					</a-form-item>

					<div class="row-inputs">
						<a-form-item
							label="地图作者"
							name="author"
							class="half-item"
							:rules="[{ required: true, message: '请输入作者名称' }]"
						>
							<a-input v-model:value="mapInfoForm.author" placeholder="作者" />
						</a-form-item>

						<a-form-item
							label="地图版本"
							name="version"
							class="half-item"
							:rules="[{ required: true, validator: checkVersion, trigger: 'change' }]"
						>
							<a-input v-model:value="mapInfoForm.version" placeholder="1.0.0" />
						</a-form-item>
					</div>

					<a-form-item label="地图说明" name="description" :rules="[{ required: true, message: '请输入地图说明' }]">
						<a-textarea
							v-model:value="mapInfoForm.description"
							:auto-size="{ minRows: 5, maxRows: 8 }"
							placeholder="请输入地图说明..."
							show-count
							:maxlength="200"
						/>
						<a-typography-paragraph type="secondary" style="font-size: 12px; margin-top: 4px;">
							支持 \n 进行换行
						</a-typography-paragraph>
					</a-form-item>
				</div>

				<div class="right-col">
					<a-form-item label="地图背景" name="background-image" class="cover-item">
						<ResourcePicker
							type="image"
							v-model="mapInfoForm.backgroundImageId"
						/>
					</a-form-item>

					<a-form-item label="地图封面" name="cover-image" class="cover-item">
						<ResourcePicker
							type="image"
							v-model="mapInfoForm.coverImageId"
						/>
						<div class="tip-text">推荐比例 16:9</div>
					</a-form-item>
				</div>
			</div>

			<div class="form-footer">
				<a-button type="default" @click="handleClose">取消</a-button>
				<a-button type="primary" html-type="submit">更新信息</a-button>
			</div>
		</a-form>
	</a-modal>
</template>

<style lang="scss">
/* 固定 Modal 高度 */
.fixed-map-info-modal {
	.ant-modal-content {
		height: 550px;
		display: flex;
		flex-direction: column;
		padding: 0;
		overflow: hidden;
	}

	.ant-modal-header {
		padding: 16px 24px;
		border-bottom: 1px solid #f0f0f0;
		margin-bottom: 0;
	}

	.ant-modal-body {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		padding: 0;
	}

	.ant-modal-close {
		top: 12px;
	}
}
</style>

<style lang="scss" scoped>
.full-height-form {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.form-body {
	flex: 1;
	overflow-y: auto;
	padding: 24px;
	display: flex;
	gap: 32px;

	&::-webkit-scrollbar {
		width: 6px;
	}
	&::-webkit-scrollbar-thumb {
		background-color: #ddd;
		border-radius: 4px;
	}

	.left-col {
		flex: 1;
		display: flex;
		flex-direction: column;

		.row-inputs {
			display: flex;
			gap: 16px;
			.half-item {
				flex: 1;
			}
		}
	}

	.right-col {
		flex: 0.75;
		// min-width: 280px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;

		.tip-text {
			font-size: 12px;
			color: #888;
			margin-top: 8px;
			text-align: center;
		}
	}
}

.form-footer {
	flex-shrink: 0;
	padding: 16px 24px;
	border-top: 1px solid #f0f0f0;
	background-color: #fff;
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}
</style>
