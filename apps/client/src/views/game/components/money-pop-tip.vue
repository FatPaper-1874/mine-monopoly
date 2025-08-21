<script setup lang="ts">
import popoverTransition from "./popover-transition.vue";
import { computed } from "vue";

const props = withDefaults(defineProps<{ money: number }>(), { money: 0 });
const tipContent = computed(() => (props.money > 0 ? `+${props.money}` : props.money));
const tipStyle = computed(() =>
	props.money < 0 ? "color: var(--color-text-error)" : "color: var(--color-text-success)"
);
</script>

<template>
	<popoverTransition>
		<span class="money-pop-tip-content" :style="tipStyle">{{ tipContent }}￥</span>
	</popoverTransition>
</template>

<style lang="scss" scoped>
.money-pop-tip-content {
	font-size: 1.6rem;
	text-shadow: 1px 1px 0 #ffffff, 0.08rem 0.08rem 0 #ffffff, -1px -1px 0 #ffffff, -0.08rem -0.08rem 0 #ffffff,
		1px -1px 0 #ffffff, 0.08rem -0.08rem 0 #ffffff, -1px 1px 0 #ffffff, -0.08rem 0.08rem 0 #ffffff;
}
</style>
