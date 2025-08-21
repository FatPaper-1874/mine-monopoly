<script setup lang="ts">
import {onMounted, ref, useSlots} from "vue";

const props = withDefaults(defineProps<{
  placement?: 'top' | 'bottom' | 'left' | 'right',
  trigger?: 'hover' | 'click'
}>(), {placement: "top", trigger: 'hover'})
const slots = defineSlots<{ content(): any, default(): any }>();

const contentStyle = ref<string>("");
const contentVisible = ref<boolean>(false);

const fpPopover = ref<HTMLElement | null>(null);

function init() {
  let style = "";
  switch (props.placement) {
    case 'top':
      style = `
          top: 0px;
          left: 50%;
          transform: translate(-50%, -50%);
          `
      break;
    case 'left':
      style = `
          top: 50%;
          left: 0;
          transform: translate(-100%, -50%);
          `
      break;
    case 'right':
      style = `
          top: 50%;
          right: 0;
          transform: translate(100%, -50%);
          `
      break;
    case 'bottom':
      style = `
          bottom: 0px;
          left: 50%;
          transform: translate(-50%, 50%);
          `
      break;
  }
  contentStyle.value = style;

  if (fpPopover.value) {
    switch (props.trigger) {
      case "click":
        fpPopover.value.addEventListener("click", () => {
          contentVisible.value = true;
        })
        break;
      case "hover":
        fpPopover.value.addEventListener("mouseenter", () => {
          contentVisible.value = true;
        })
        break;
    }
    fpPopover.value.addEventListener("mouseleave", () => {
      contentVisible.value = false;
    })
  }
}

onMounted(() => {
  init();
})
</script>

<template>
  <div @click.stop ref="fpPopover" class="fp-popover">
    <slot name="default"></slot>
    <div v-if="contentVisible" :style="contentStyle" class="content">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fp-popover {
  position: relative;

  & > .content {
    z-index: -1;
    position: absolute;
  }
}
</style>