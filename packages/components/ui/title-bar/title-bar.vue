<script lang="ts" setup>
import { onMounted, ref } from "vue";

const props = defineProps<{
	bgColor: string;
	title?: string;
}>();

const isMaximized = ref(false);

const checkMaximized = async () => {
	isMaximized.value = await window.electronAPI.isMaximized();
};

onMounted(() => {
	checkMaximized();
});

const minimizeWindow = () => {
	window.electronAPI.minimize();
};

const toggleMaximize = () => {
	window.electronAPI.maximize();
	checkMaximized();
};

const handleMaximize = () => {
	if (window.innerWidth === screen.width && window.innerHeight === screen.height) {
		window.electronAPI.unmaximize();
	} else {
		window.electronAPI.maximize();
	}
	checkMaximized();
};

const closeWindow = () => {
	window.electronAPI.close();
};
</script>

<template>
	<div class="title-bar" :style="{ backgroundColor: props.bgColor }" @dblclick="handleMaximize">
		<!-- 拖拽区域 -->
		<div class="drag-area">
			<slot name="title"></slot>
		</div>

		<!-- 窗口控制按钮 -->
		<div class="window-controls">
			<button @click="minimizeWindow" class="control-button minimize">
				<font-awesome-icon :icon="['fas', 'window-minimize']" />
			</button>
			<button @click="toggleMaximize" class="control-button maximize">
				<font-awesome-icon :icon="['fas', isMaximized ? 'window-restore' : 'window-maximize']" />
			</button>
			<button @click="closeWindow" class="control-button close">
				<font-awesome-icon :icon="['fas', 'rectangle-xmark']" />
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.title-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 30px;
	min-height: 30px;
	color: white;
	user-select: none;
	-webkit-app-region: drag;
}

.drag-area {
	flex: 1;
	display: flex;
	align-items: center;
	height: 100%;
	-webkit-app-region: drag;
	padding-left: 10px;
	overflow: hidden;
}

.window-controls {
	display: flex;
	height: 100%;
	-webkit-app-region: no-drag;
}

.control-button {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 46px;
	height: 100%;
	border: none;
	background: transparent;
	color: white;
	transition: background-color 0.2s;
}

.control-button:hover {
	background-color: rgba(255, 255, 255, 0.1);
}

.control-button.close:hover {
	background-color: #e81123;
}

.control-button span {
	font-size: 16px;
	line-height: 1;
}
</style>
