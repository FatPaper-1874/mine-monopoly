<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, onBeforeMount, ref } from "vue";
import { requestFullScreen, isFullScreen as _isFullScreen, isLandscape as _isLandscape } from "@src/utils";
import { useDeviceStatus } from "@src/store";

const deviceStatus = useDeviceStatus();

// const isFullScreen = computed(() => deviceStatus.isFullScreen);
const isLandscape = computed(() => deviceStatus.isLandscape);
</script>

<template>
	<!-- <div v-show="!isFullScreen || !isLandscape" @click="requestFullScreen" id="screen-mask"> -->
	<div v-show="!isLandscape" id="screen-mask">
		<!-- <div v-show="!isFullScreen" class="text_container">
      <span>请点击任意区域进入全屏</span>
      <FontAwesomeIcon beat class="icon" icon="expand"/>
    </div> -->

		<div v-show="!isLandscape" class="text_container">
			<span>请解除屏幕锁定并进入横屏状态</span>
			<FontAwesomeIcon spin class="icon" icon="rotate" />
		</div>
	</div>
</template>

<style scoped lang="scss">
#screen-mask {
	width: 100vw;
	height: 100vh;
	position: fixed;
	top: 0;
	left: 0;
	z-index: 999999;
	background-color: #000000;
	color: #ffffff;
	font-size: 2.5rem;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;

	.text_container {
		text-align: center;
		margin: 3rem 0;

		& > span {
			margin-right: 1rem;
		}
	}
}
</style>
