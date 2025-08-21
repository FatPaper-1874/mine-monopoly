<script setup lang="ts">
import { computed, ref } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const props = defineProps({
	type: {
		type: String,
		default: "info",
		validator(value: string) {
			return ["success", "warning", "error", "info"].includes(value);
		},
	},
	message: {
		type: String,
		default: "Empty Message",
	},
	delay: {
		type: Number,
		default: 3000,
	},
});

const iconList = {
	success: "circle-check",
	warning: "circle-exclamation",
	error: "circle-xmark",
	info: "circle-info",
};

const top = ref(0);

const show = ref(false);

const classType = computed(() => ["fp-message", props.type]);

//@ts-ignore
const iconName = computed(() => `fa-solid fa-${iconList[props.type]}`);

function setTop(newValue: number){
	top.value = newValue;
};

function setVisible(newState: boolean){
	return new Promise((resolve, reject) => {
		show.value = newState;
		let timer = setTimeout(() => {
			clearTimeout(timer);
			//@ts-ignore
			timer = null;
			resolve("");
		}, 200);
	});
};

defineExpose({
	setVisible,
	setTop,
});
</script>

<template>
	<transition name="fp">
		<div :style="{ top: top + 'rem' }" v-show="show" :class="classType">
			<font-awesome-icon class="icon" :icon="iconName" />{{ message }}
		</div>
	</transition>
</template>

<style lang="scss" scoped>
.fp-message {
	position: fixed;
	left: 50%;
	top: 0;
	transform: translateX(-50%);
	min-width: 20rem;
	height: 2.8rem;
	line-height: 2.8rem;
	padding: 0 0.6rem;
	border-radius: 0.4rem;
	border: 0.12rem solid;
	z-index: 999999999;
	transition: top 0.2s ease-in-out;

	&>.icon {
		margin-right: 0.5rem;
		font-size: 1.2rem;
		vertical-align: text-bottom;
	}

	&.success {
		background-color: #e1f3d8;
		border-color: #d1edc4;
		color: #529b2e;
	}

	&.warning {
		background-color: #faecd8;
		border-color: #f8e3c5;
		color: #b88230;
	}

	&.error {
		background-color: #fde2e2;
		border-color: #fcd3d3;
		color: #c45656;
	}

	&.info {
		background-color: #cedfff;
		border-color: #a8d4ff;
		color: #095fce;
	}
}

.fp-enter-active,
.fp-leave-active {
	transition: all 0.2s ease-out;
}

.fp-enter-from,
.fp-leave-to {
	transform: translate(-50%, -20px);
	opacity: 0;
}
</style>
