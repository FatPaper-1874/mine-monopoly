<script setup lang="ts">
import { computed } from "vue";
import { evalExpression, parseVFor } from "./utils"; // 调整引入路径
import type { UISchema } from "@mine-monopoly/types"; // 假设的类型路径

defineOptions({
	name: "UiRenderer",
});

const props = defineProps<{
	schema: UISchema;
	context: Record<string, any>;
}>();

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
	return !!evalExpression(props.context, props.schema.vShow);
});

// 2. 处理文本内容 (优先使用 textBinding)
const textContent = computed(() => {
	if (props.schema.textBinding) {
		const val = evalExpression(props.context, props.schema.textBinding);
		return val !== null && val !== undefined ? String(val) : "";
	}
	return props.schema.content || "";
});

// 3. 处理样式绑定 (静态 style + 动态 styleBinding)
const computedStyle = computed(() => {
	const styles: Record<string, string | number> = { ...props.schema.style };

	if (props.schema.styleBinding) {
		Object.entries(props.schema.styleBinding).forEach(([cssProp, expr]) => {
			const val = evalExpression(props.context, expr);
			if (val !== undefined && val !== null) {
				styles[cssProp] = val;
			}
		});
	}
	return styles;
});

// 4. 处理 Props 绑定 (静态 props + 动态 propsBinding)
const computedProps = computed(() => {
	const finalProps: Record<string, any> = { ...props.schema.props };

	if (props.schema.propsBinding) {
		Object.entries(props.schema.propsBinding).forEach(([key, expr]) => {
			const val = evalExpression(props.context, expr);
			if (val !== undefined && val !== null) {
				finalProps[key] = val;
			}
		});
	}
	return finalProps;
});

// 5. v-for: 获取列表数据
const getList = (vForExpr: string) => {
	const { listExpr } = parseVFor(vForExpr);
	if (!listExpr) return [];
	const list = evalExpression(props.context, listExpr);
	return Array.isArray(list) ? list : [];
};

// 6. v-for: 生成子项上下文
const getItemContext = (vForExpr: string, itemValue: any, index: number) => {
	const { itemKey, indexKey } = parseVFor(vForExpr);
	return {
		...props.context,
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

				<UiRenderer v-else :schema="child" :context="context" />
			</template>
		</template>
	</component>
</template>

<style scoped>
.ui-text-node {
	display: inline-block;
}
</style>
