<script setup lang="ts"></script>

<template>
	<Transition name="popover" appear>
		<slot></slot>
	</Transition>
</template>

<style lang="scss" scoped>
.popover-enter-active,
.popover-leave-active {
	transition: all 0.8s ease-in;
}

.popover-enter-from,
.popover-leave-to {
	opacity: 0;
}
</style>
