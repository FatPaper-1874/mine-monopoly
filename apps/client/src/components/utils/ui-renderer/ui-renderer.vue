<script setup lang="ts">
import { computed, ref } from "vue";
import { evalExpression, parseVFor } from "./utils"; // 调整引入路径
import type { UISchema } from "@mine-monopoly/types"; // 假设的类型路径

defineOptions({
	name: "UiRenderer",
});

const props = defineProps<{
	schema: UISchema;
	context: Record<string, any>;
}>();

// 将 schema.variable 合并到 context 中，variable 优先级更高
const mergedContext = computed(() => ({
	...props.context,
	...props.schema.variable,
}));

// 如果是 text 类型且包含 x/y 坐标，必须渲染为 <text> 而非 <span>
const isSvgText = computed(() => {
	if (props.schema.type !== "text") return false;
	const p = props.schema.props || {};
	return p.x !== undefined || p.y !== undefined;
});

// 1. 处理 v-show (显隐控制)
const shouldShow = computed(() => {
	if (!props.schema.vShow) return true;
	// evalExpression 内部处理了 boolean 转换，但为了保险再转一次
	return !!evalExpression(mergedContext.value, props.schema.vShow);
});

// 2. 处理文本内容 (优先使用 textBinding)
const textContent = computed(() => {
	if (props.schema.textBinding) {
		const val = evalExpression(mergedContext.value, props.schema.textBinding);
		return val !== null && val !== undefined ? String(val) : "";
	}
	return props.schema.content || "";
});

// 3. 处理样式绑定 (静态 style + 动态 styleBinding)
const computedStyle = computed(() => {
	const styles: Record<string, string | number | undefined> = { ...props.schema.style };

	if (props.schema.styleBinding) {
		Object.entries(props.schema.styleBinding).forEach(([cssProp, expr]) => {
			const val = evalExpression(mergedContext.value, expr);
			if (val !== undefined && val !== null) {
				styles[cssProp] = val;
			}
		});
	}

	// 如果没有任何样式，返回 undefined 而不是空对象
	// 这样可以避免覆盖 CSS 继承的 white-space 属性
	if (Object.keys(styles).length === 0) {
		return undefined;
	}

	return styles;
});

// 4. 处理 Props 绑定 (静态 props + 动态 propsBinding)
const computedProps = computed(() => {
	const finalProps: Record<string, any> = { ...props.schema.props };

	if (props.schema.propsBinding) {
		Object.entries(props.schema.propsBinding).forEach(([key, expr]) => {
			const val = evalExpression(mergedContext.value, expr);
			if (val !== undefined && val !== null) {
				finalProps[key] = val;
			}
		});
	}

	// 添加对 class 属性的特殊处理
	// 支持 className（React 风格）和 class（Vue 风格）
	if (finalProps.className) {
		finalProps.class = finalProps.className;
		delete finalProps.className;
	}

	return finalProps;
});

// 5. v-for: 获取列表数据
const getList = (vForExpr: string) => {
	const { listExpr } = parseVFor(vForExpr);
	if (!listExpr) return [];
	const list = evalExpression(mergedContext.value, listExpr);
	return Array.isArray(list) ? list : [];
};

// 6. v-for: 生成子项上下文
const getItemContext = (vForExpr: string, itemValue: any, index: number) => {
	const { itemKey, indexKey } = parseVFor(vForExpr);
	return {
		...mergedContext.value,
		[itemKey]: itemValue,
		[indexKey]: index,
	};
};
</script>

<template>
	<template v-if="schema.type === 'text' && !isSvgText">
		<span v-if="shouldShow" :style="computedStyle" class="ui-text-node">
			{{ textContent }}
		</span>
	</template>

	<!-- 处理 br 标签 -->
	<br v-else-if="schema.type === 'br'" :class="computedProps.class" />

	<component v-else :is="schema.type" v-show="shouldShow" v-bind="computedProps" :style="computedStyle">
		{{ textContent }}

		<template v-if="schema.children && schema.children.length">
			<template v-for="child in schema.children" :key="child.id">
				<template v-if="child.vFor">
					<UiRenderer
						v-for="(item, index) in getList(child.vFor)"
						:key="`${child.id}-${index}`"
						:schema="child"
						:context="getItemContext(child.vFor, item, index)"
					/>
				</template>

				<UiRenderer v-else :schema="child" :context="mergedContext" />
			</template>
		</template>
	</component>
</template>

<style scoped>
.ui-text-node {
	/* Remove inline-block, use default inline */
	/* Inherit white-space from parent element */
	white-space: inherit;

	/* Support preserve-whitespace class */
	&.preserve-whitespace {
		white-space: pre-wrap;
	}
}

.rich-text-line-break {
	/* Line breaks should not affect text rendering */
	/* Only use this for explicit <br> tags from rich text */
}
</style>
