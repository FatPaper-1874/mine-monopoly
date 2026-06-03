/**
 * Vue 自定义指令
 *
 * @example
 * ```vue
 * <script setup>
 * import { vSound } from '@/directives';
 * </script>
 *
 * <template>
 *   <button v-sound>按钮</button>
 *   <button v-sound.hover>悬停音效</button>
 * </template>
 * ```
 */

export { default as vSound } from "./sound";
export { default as soundDirective } from "./sound";
export { default as vPress } from "./press";
export { default as vStagger } from "./stagger";
