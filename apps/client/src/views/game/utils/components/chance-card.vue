<template>
	<div class="chance-card" :style="{ backgroundColor: chanceCard.color }">
		<div class="chance-card-icon">
			<img :src="iconUrl" alt="icon" />
		</div>
		<div class="chance-card-content">
			<div class="chance-card-name">{{ chanceCard.name }}</div>
			<div class="chance-card-description">{{ chanceCard.description }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ChanceCardInfo } from "@mine-monopoly/types";
import { useResourceStore } from "@src/store/game";

const props = defineProps<{
	chanceCard: ChanceCardInfo;
}>();

const resourceStore = useResourceStore();

const iconUrl = computed(() => {
	const resource = resourceStore.getRecourceById(props.chanceCard.iconId);
	return resource?.url || "";
});
</script>

<style scoped>
.chance-card {
	width: 120px;
	height: 160px;
	border-radius: 8px;
	padding: 10px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	pointer-events: none;
	user-select: none;
}

.chance-card-icon {
	width: 60px;
	height: 60px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.chance-card-icon img {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.chance-card-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	text-align: center;
}

.chance-card-name {
	font-size: 14px;
	font-weight: bold;
	color: #ffffff;
	text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.chance-card-description {
	font-size: 10px;
	color: #ffffff;
	text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
}
</style>
