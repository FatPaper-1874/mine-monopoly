<script setup lang="ts">
import { computed, watch } from "vue";
import { ChanceCardInfo } from "@src/interfaces/game";
import { __PROTOCOL__ } from "@src/../global.config";

const props = defineProps<{ chanceCard: ChanceCardInfo; disable: boolean }>();

const iconUrl = computed(() => {
	return props.chanceCard.icon.includes("http") ? props.chanceCard.icon : `${__PROTOCOL__}://${props.chanceCard.icon}`;
});
</script>

<template>
	<div class="chance-card" :class="{ disable }" :style="{ border: `0.4em solid ${chanceCard.color}` }">
		<div class="icon" v-if="chanceCard.icon"><img :src="iconUrl" alt="" /></div>
		<div class="name" :style="{ color: chanceCard.color }">{{ chanceCard.name }}</div>
		<div class="describe" :style="{ color: chanceCard.color }">{{ chanceCard.describe }}</div>
	</div>
</template>

<style lang="scss" scoped>
.chance-card {
	min-width: 11rem;
	min-height: 14rem;
	width: 11rem;
	height: 14rem;
	font-size: 0.8rem;
	background-color: #ffffff;
	box-sizing: border-box;
	border-radius: 2.2rem;
	box-shadow: 0 0 0.2rem rgba(0, 0, 0, 0.32);
	user-select: none;
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	overflow: hidden;
	transition: 0.3s;

	&.disable {
		filter: grayscale(1);
		pointer-events: none;
		cursor: not-allowed;
	}

	& > .icon {
		margin-bottom: 0.6em;

		& > img {
			$img-size: 5.2em;
			width: $img-size;
			height: $img-size;
			pointer-events: none;
			user-select: none;
		}
	}

	& > .name {
		font-size: 1.5em;
		font-weight: 700;
		margin-bottom: 0.8em;
	}

	& > .describe {
		width: 80%;
		font-weight: 700;
		font-size: 0.9em;
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
