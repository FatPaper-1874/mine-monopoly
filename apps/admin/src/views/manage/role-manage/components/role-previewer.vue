<script setup lang="ts">
import { nextTick, onMounted, watch, ref, onUpdated, onUnmounted, onBeforeMount, onBeforeUnmount } from "vue";
import { __MONOPOLYSERVER__ } from "@G/global.config";
import { RolePreviewerRenderer } from "@/views/manage/role-manage/components/utils/RolePreviewerRenderer";
import { RoleModel } from "@/views/manage/role-manage/components/utils/RoleModel";

const props = defineProps<{ baseUrl: string; fileName: string }>();

let rolePreviewer: RolePreviewerRenderer | undefined;
let role: RoleModel | undefined;

onMounted(() => {
	nextTick(() => {
		const canvasEl = document.getElementById("role-previewer__canvas") as HTMLCanvasElement;
		rolePreviewer = new RolePreviewerRenderer(canvasEl);
		// loadModel()
	});
});

onUnmounted(() => {
	rolePreviewer && rolePreviewer.destroy();
});

watch(
	() => props.fileName,
	(newFileName) => {
		if (newFileName) {
			loadModel();
		} else {
			rolePreviewer && rolePreviewer.clear();
		}
	}
);

const loadModel = async () => {
	if (rolePreviewer && props.baseUrl && props.fileName) {
		const _role = await rolePreviewer.loadRoleModel(props.baseUrl, props.fileName);
		role = _role;
		updateAnimationList(_role.getAnimationList());
	}
};

const animationList = ref<string[]>([]);
const isAnimationLoop = ref<boolean>(false);

function updateAnimationList(newList: string[]) {
	animationList.value = newList;
}

function doAnimation(name: string) {
	role && role.doAnimation(name, isAnimationLoop.value);
}
</script>

<template>
	<div class="previewer-container">
		<div class="ui-container">
			<p>模型动画列表</p>
			<input type="checkbox" id="animationLoop" v-model="isAnimationLoop" />
			<label for="animationLoop">循环</label>
			<ul>
				<li class="animation-item" v-for="name in animationList" @click="doAnimation(name)">
					{{ name }}
				</li>
			</ul>
		</div>
		<canvas id="role-previewer__canvas"></canvas>
	</div>
</template>

<style scoped lang="scss">
.previewer-container {
	width: 100%;
	height: 100%;
	position: relative;
	border-radius: 10px;
	overflow: hidden;

	.ui-container {
		position: absolute;
		left: 10px;
		top: 10px;
		background-color: #ffffff;
		padding: 10px;
		border-radius: 10px;

		.animation-item {
			list-style: none;
			margin: 4px 0;
			border-radius: 4px;
			border: 1px solid;
			text-align: center;

			&:hover {
				background-color: #0077ff;
				color: #ffffff;
				cursor: pointer;
			}
		}
	}
}

#role-previewer__canvas {
	display: block;
	border-radius: 10px;
	width: 100%;
	height: 100%;
}
</style>
