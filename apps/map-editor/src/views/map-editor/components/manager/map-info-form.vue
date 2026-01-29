<script setup lang="ts">
import { GameMapInfo } from "@mine-monopoly/types";
import { useMapDataStore, useResourceStore } from "@src/stores";
import { addNewImage } from "@src/utils/file";
import { message } from "ant-design-vue";
import { Rule } from "ant-design-vue/es/form";
import { ref, reactive, onUpdated, watch } from "vue";

const visible = defineModel({ default: false });

const mapInfoForm = reactive<GameMapInfo>({ ...useMapDataStore().info });
const coverImageUrl = ref("");
const coverImagePreview = ref("");

watch(
	() => visible,
	async () => {
		if (!coverImageUrl.value) {
			coverImagePreview.value = await getCoverImagePreviewUrl();
		}
		Object.assign(mapInfoForm, useMapDataStore().info);
	},
	{ immediate: true },
);

async function getCoverImagePreviewUrl() {
	const imageResourceId = useMapDataStore().info.coverImageId;
	const imageResource = useResourceStore().findImageById(imageResourceId);
	if (!imageResource) return "";
	return imageResource.url;
}

async function handleUpdateInfo() {
	try {
		if (coverImageUrl.value) {
			const coverImageId = await addNewImage(coverImageUrl.value, "CoverImage");
			useMapDataStore().setCoverImageId(coverImageId);
		}
		useMapDataStore().updateMapInfo({
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

async function handleAddCoverImage() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "地图封面", extensions: ["png", "jpg", "jpeg"] }],
		properties: ["openFile"],
	});

	if (res.filePaths.length > 0) {
		coverImageUrl.value = res.filePaths[0];
		const content = await window.electronAPI.getImageBase64(coverImageUrl.value);
		coverImagePreview.value = `data:image/png;base64,${content}`;
	}
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
	coverImageUrl.value = "";
	coverImagePreview.value = "";
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
					</a-form-item>
				</div>

				<div class="right-col">
					<a-form-item label="地图封面" name="cover-image" class="cover-item">
						<div class="cover-upload-box" @click="handleAddCoverImage">
							<img v-if="coverImagePreview" :src="coverImagePreview" class="cover-preview" />
							<div v-else class="placeholder">
								<span class="icon">🖼️</span>
								<span>点击设置封面</span>
							</div>
							<div class="hover-tip">点击更换</div>
						</div>
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
		flex: 1.2;
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
		flex: 0.8;
		min-width: 220px;

		.cover-item {
			height: 100%;
		}

		.cover-upload-box {
			width: 100%;
			aspect-ratio: 16/9;
			background-color: #f5f5f5;
			border: 1px dashed #d9d9d9;
			border-radius: 8px;
			cursor: pointer;
			position: relative;
			overflow: hidden;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.3s;

			&:hover {
				border-color: #1890ff;
				.hover-tip {
					opacity: 1;
				}
			}

			.cover-preview {
				width: 100%;
				height: 100%;
				object-fit: contain;
				padding: 8px;
				box-sizing: border-box;
			}

			.placeholder {
				display: flex;
				flex-direction: column;
				align-items: center;
				color: #999;
				font-size: 13px;
				.icon {
					font-size: 24px;
					margin-bottom: 8px;
				}
			}

			.hover-tip {
				position: absolute;
				inset: 0;
				background: rgba(0, 0, 0, 0.5);
				color: white;
				display: flex;
				align-items: center;
				justify-content: center;
				opacity: 0;
				transition: opacity 0.3s;
				font-weight: bold;
			}
		}

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
