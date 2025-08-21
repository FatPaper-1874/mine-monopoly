<script setup lang="ts">
import { __PROTOCOL__ } from "@G/global.config";
import { computed, watch } from "vue";

const props = defineProps({
	id: { type: String, default: "" },
	name: { type: String, default: "" },
	describe: { type: String, default: "" },
	icon: { type: String, default: "" },
	color: { type: String, default: "rgb(255, 187, 50)" },
});

const iconUrl = computed(() => {
	return props.icon.includes("http") ? props.icon : `${__PROTOCOL__}://${props.icon}`;
});
</script>

<template>
	<div class="chance-card" :style="{ border: `0.4em solid ${props.color}` }">
		<div class="icon" v-if="icon"><img :src="iconUrl" alt="" /></div>
		<div class="name" :style="{ color }">{{ name }}</div>
		<div class="describe" :style="{ color: props.color }">{{ describe }}</div>
	</div>
</template>

<style lang="scss" scoped>
.chance-card {
	font-size: 16px;
	min-width: 10.5em;
	min-height: 14em;
	width: 10.5em;
	height: 14em;
	background-color: #ffffff;
	box-sizing: border-box;
	border-radius: 1.3em;
	box-shadow: 0px 0px 12px rgba(0, 0, 0, 0.12);
	user-select: none;
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	overflow: hidden;

	& > .icon {
		margin-bottom: 0.6em;

		& > img {
			$img-size: 4.4em;
			width: $img-size;
			height: $img-size;
		}
	}

	& > .name {
		font-size: 1.3em;
		font-weight: 700;
		margin-bottom: 0.8em;
	}

	& > .describe {
		width: 80%;
		font-weight: 700;
		font-size: 0.75em;
		margin-bottom: 1em;
		word-wrap: break-word;
		overflow-y: scroll;
		text-align: center;

		&::-webkit-scrollbar {
			display: none;
		}
	}
}
</style>
