<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { ref, computed } from "vue";
import { marked } from "marked";
import helpContent from "@src/assets/help.md?raw";

const helpVisible = ref(false);

const helpHtml = computed(() => marked.parse(helpContent) as string);
</script>

<template>
	<button @click="helpVisible = true" class="help-button btn-small" title="帮助"><FontAwesomeIcon icon="question" /></button>
	<FpDialog :style="'width: 70%; height: 70%;'" v-model:visible="helpVisible" :cancel-text="''">
		<template #title>帮助 / Tips</template>
		<div class="help-container" v-html="helpHtml"></div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.help-button {
	height: 2.5rem;
	width: 2.5rem;
	border-radius: 0.5rem;
	font-size: 1.1rem;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
}
.help-container {
	:deep(h2),
		:deep(h3) {
		color: var(--color-primary);
		margin-top: 1rem;

		&:first-child {
			margin-top: 0;
		}
	}

	:deep(ul) {
		list-style: none;
		padding-left: 0;
		margin: 0;
	}

	:deep(li) {
		color: #3e3e3e;
		line-height: 1.6;
		margin-bottom: 0.3rem;
		padding-left: 1em;
		text-indent: -1em;

		&::before {
			content: "- ";
			color: var(--color-second);
		}
	}

	:deep(p) {
		color: #3e3e3e;
		line-height: 1.6;
	}

	:deep(strong) {
		color: var(--color-text-second);
	}
}
</style>
