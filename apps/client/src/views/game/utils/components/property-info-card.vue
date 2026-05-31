<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { PropertyInfo } from "@mine-monopoly/types";
import { useMapData, useGameData } from "@src/store/game";
import UiRenderer from "@src/components/utils/ui-renderer/ui-renderer.vue";

const props = defineProps<{ property: PropertyInfo | null }>();

const _property = ref<PropertyInfo | null>(props.property);

// 转换地产自定义效果描述中的 \n
const formattedCustomDescription = computed(() => {
	if (!_property.value?.custom?.description) return "";
	return _property.value.custom.description.replace(/\\n/g, "\n");
});

// 当前过路费（根据等级）
const currentToll = computed(() => {
	if (!_property.value || _property.value.level == null) return null;
	return _property.value.costList[_property.value.level];
});

// 是否有拥有者
const hasOwner = computed(() => !!_property.value?.owner);

watch(
	() => props.property,
	(newProperty) => {
		updateProperty(newProperty);
	},
);

function updateProperty(newProperty: PropertyInfo | null) {
	_property.value = newProperty;
}

function getUiTemplateById(id: string) {
	const schema = useMapData().getUITempolateById(id)?.template || {
		id: "404",
		type: "text",
		content: `找不到ID为: ${id} 的UI组件`,
	};
	return schema;
}

defineExpose({ updateProperty });
</script>

<template>
	<template v-if="_property">
		<!-- 自定义 UI -->
		<template v-if="_property.customUI">
			<div class="property-info custom-ui">
				<UiRenderer
					:schema="getUiTemplateById(_property.customUI)"
					:context="{ property: _property, exportData: useGameData().exportData }"
				/>
			</div>
		</template>

		<!-- 默认 UI -->
		<div class="property-info" v-else>
			<!-- 头部：名称和等级 -->
			<div class="property-header">
				<h2 class="property-name">{{ _property.name }}</h2>
				<div class="badges-row">
					<div class="property-badge level-badge">LV {{ _property.level }}</div>
					<!-- 无主人时显示空地价格 -->
					<div class="property-badge price-badge" v-if="!hasOwner">
						<span class="badge-text">购买费用</span>
						<span class="badge-divider">|</span>
						<span class="badge-label">{{ _property.sellCost }}</span>
					</div>
					<!-- 有主人时显示当前过路费 -->
					<div class="property-badge toll-badge" v-else-if="currentToll !== null">
						<span class="badge-text">过路费</span>
						<span class="badge-divider">|</span>
						<span class="badge-label">{{ currentToll }}</span>
					</div>
				</div>
			</div>

			<!-- 分隔线 -->
			<div class="divider"></div>

			<!-- 自定义描述区 -->
			<div class="property-section custom-desc" v-if="_property.custom">
				<div class="custom-description">{{ formattedCustomDescription }}</div>
			</div>

			<!-- 费用信息区 -->
			<template v-else>
				<div class="property-section">
					<div class="section-title">费用信息</div>
					<div class="cost-list">
						<div class="cost-item">
							<span class="cost-icon">🏷️</span>
							<span class="cost-label">空地价格</span>
							<span class="cost-value">{{ _property.sellCost }}</span>
						</div>
						<div class="cost-item">
							<span class="cost-icon">🔨</span>
							<span class="cost-label">升级费用</span>
							<span class="cost-value">{{ _property.buildCost }}</span>
						</div>
					</div>
					<div class="section-title toll-title">过路费</div>
					<div class="toll-grid">
						<div
							class="toll-item"
							v-for="(cost, index) in _property.costList"
							:key="index"
							:class="{ 'current-toll': index === _property.level }"
						>
							<span class="toll-level">LV{{ index }}</span>
							<span class="toll-amount">{{ cost }}</span>
						</div>
					</div>
				</div>

				<!-- 分隔线 -->
				<div class="divider"></div>

				<!-- 拥有者信息 -->
				<div class="property-footer">
					<span class="owner-label">拥有者</span>
					<span
						class="owner-value"
						:class="{ 'no-owner': !_property.owner }"
						:style="{ color: _property.owner ? _property.owner.color : undefined }"
					>
						{{ _property.owner ? _property.owner.username : "无" }}
					</span>
				</div>
			</template>
		</div>
	</template>
</template>

<style lang="scss" scoped>
@use "@src/assets/variables" as *;
@use "@mine-monopoly/style/variables" as fp;
@use "@mine-monopoly/style/mixins" as fp-mixins;

.property-info {
	@include fp-mixins.fp-felt-patch;
	min-width: 16rem;
	max-width: 20rem;
	display: flex;
	flex-direction: column;
	gap: 0.8rem;
	padding: 1rem 1.5rem;
	background-color: #fff;

	// 头部区域
	.property-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding-bottom: 0.5rem;

		.property-name {
			font-size: 1.3rem;
			// font-weight: bold;
			color: var(--fp-color-primary);
			text-align: center;
			text-shadow: var(--fp-text-shadow-surround-white);
			margin: 0;
			margin-bottom: 0.3rem;
		}

		// 徽章行
		.badges-row {
			display: flex;
			gap: 0.5rem;
			align-items: center;
		}

		.level-badge {
			padding: 0.25rem 0.75rem;
			background: var(--fp-color-tertiary);
			color: #fff;
			border-radius: 1rem;
			font-size: 0.85rem;
			font-weight: bold;
			box-shadow: 0 2px rgba(0, 0, 0, 0.15);
		}

		// 空地价格徽章
		.price-badge {
			padding: 0.25rem 0.75rem;
			background: var(--fp-color-primary);
			color: #fff;
			border-radius: 1rem;
			font-size: 0.9rem;
			// font-weight: bold;
			box-shadow: 0 2px rgba(0, 0, 0, 0.15);
			display: flex;
			align-items: center;
			gap: 0.25rem;

			.badge-text {
				font-size: 0.8rem;
			}

			.badge-divider {
				font-size: 0.7rem;
				opacity: 0.6;
			}

			.badge-label {
				font-size: 0.9rem;
			}
		}

		// 过路费徽章
		.toll-badge {
			padding: 0.25rem 0.75rem;
			background: #4caf50;
			color: #fff;
			border-radius: 1rem;
			font-size: 0.9rem;
			font-weight: bold;
			box-shadow: 0 2px rgba(0, 0, 0, 0.15);
			display: flex;
			align-items: center;
			gap: 0.25rem;

			.badge-text {
				font-size: 0.8rem;
			}

			.badge-divider {
				font-size: 0.7rem;
				opacity: 0.6;
			}

			.badge-label {
				font-size: 0.9rem;
			}
		}
	}

	// 分隔线
	.divider {
		height: 1px;
		background: rgba(0, 0, 0, 0.1);
	}

	// 信息分组
	.property-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		.section-title {
			font-size: 0.75rem;
			color: var(--fp-color-text-secondary);
			text-transform: uppercase;
			letter-spacing: 0.05em;
			opacity: 0.8;
		}

		.toll-title {
			margin-top: 0.25rem;
		}
	}

	// 费用列表
	.cost-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		box-sizing: border-box;

		.cost-item {
			display: flex;
			align-items: center;
			gap: 0.5rem;

			.cost-icon {
				font-size: 1rem;
				width: 1.5rem;
				text-align: center;
			}

			.cost-label {
				flex: 1;
				font-size: 0.85rem;
				color: var(--fp-color-text-secondary);
			}

			.cost-value {
				font-size: 0.9rem;
				color: var(--fp-color-secondary);
				text-shadow: var(--fp-text-shadow-surround-white);
			}
		}
	}

	// 过路费网格
	.toll-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem;

		.toll-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 0.3rem 0.5rem;
			background: rgba(255, 255, 255, 0.5);
			border-radius: 0.4rem;
			font-size: 0.8rem;

			.toll-level {
				color: var(--fp-color-primary);
			}

			.toll-amount {
				color: var(--fp-color-secondary);
			}

			// 当前等级过路费标记
			&.current-toll {
				background: rgba(76, 175, 80, 0.15);
				border: 1px solid #4caf50;

				.toll-level,
				.toll-amount {
					color: #4caf50;
				}
			}
		}
	}

	// 自定义描述
	.custom-desc {
		.custom-description {
			font-size: 0.85rem;
			color: var(--fp-color-text-primary);
			line-height: 1.5;
			white-space: pre-wrap;
			text-align: center;
			padding: 0.5rem;
		}
	}

	// 底部拥有者
	.property-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 0.5rem;
		margin-top: auto;

		.owner-label {
			font-size: 0.85rem;
			color: var(--fp-color-text-secondary);
		}

		.owner-value {
			font-size: 0.95rem;
			font-weight: bold;
			text-shadow: var(--fp-text-shadow-surround-white);

			&.no-owner {
				color: var(--fp-color-text-secondary) !important;
				font-style: italic;
			}
		}
	}
}
</style>
