<script setup lang="ts">
import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import { ModifierTemplate } from "@mine-monopoly/types";
import { useMapDataStore } from "@src/stores";
import { generateShortId } from "@src/utils/short-id";
import ModifierTemplateEditor from "./form/modifier-template-editor.vue";

const mapStore = useMapDataStore();
const model = defineModel<boolean>({ default: false });

// 状态定义
const editorVisible = ref(false);
const currentTemplate = ref<ModifierTemplate | null>(null);
const isEditing = computed(() => !!currentTemplate.value?.id && mapStore.modifierTemplates.some(t => t.id === currentTemplate.value!.id));

// 分类筛选状态
const selectedCategory = ref<string>("all");
const searchText = ref("");

// 分类类型
type CategoryType = "all" | "source" | "tag";

// 获取所有可用的分类
const categories = computed(() => {
	const sources = new Set<string>();
	const tags = new Set<string>();

	for (const template of mapStore.modifierTemplates) {
		if (template.descriptor.meta?.source) {
			sources.add(template.descriptor.meta.source);
		}
		if (template.descriptor.meta?.tags) {
			for (const tag of template.descriptor.meta.tags) {
				tags.add(tag);
			}
		}
	}

	return {
		sources: Array.from(sources).sort(),
		tags: Array.from(tags).sort(),
	};
});

// 当前选中的分类信息
const currentCategoryInfo = computed(() => {
	if (selectedCategory.value === "all") {
		return { type: "all" as CategoryType, value: "all" };
	}
	// 检查是否是 source
	if (categories.value.sources.includes(selectedCategory.value)) {
		return { type: "source" as CategoryType, value: selectedCategory.value };
	}
	// 检查是否是 tag
	if (categories.value.tags.includes(selectedCategory.value)) {
		return { type: "tag" as CategoryType, value: selectedCategory.value };
	}
	return { type: "all" as CategoryType, value: "all" };
});

// 筛选后的模板列表
const filteredTemplates = computed(() => {
	let templates = [...mapStore.modifierTemplates];

	// 按分类筛选
	const catInfo = currentCategoryInfo.value;
	if (catInfo.type !== "all") {
		templates = templates.filter(template => {
			if (catInfo.type === "source") {
				return template.descriptor.meta?.source === catInfo.value;
			}
			if (catInfo.type === "tag") {
				return template.descriptor.meta?.tags?.includes(catInfo.value);
			}
			return true;
		});
	}

	// 按搜索文本筛选
	if (searchText.value) {
		const query = searchText.value.toLowerCase();
		templates = templates.filter(template =>
			template.name.toLowerCase().includes(query) ||
			template.slug.toLowerCase().includes(query) ||
			template.id.toLowerCase().includes(query) ||
			template.descriptor.commandType?.toLowerCase().includes(query)
		);
	}

	// 排序
	return templates.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
});

// 分组显示的模板
const groupedTemplates = computed(() => {
	const catInfo = currentCategoryInfo.value;

	// 如果选择了特定分类，不需要分组
	if (catInfo.type !== "all") {
		return {
			"": filteredTemplates.value,
		};
	}

	// 动态按source分组
	const groups: Record<string, ModifierTemplate[]> = {};

	for (const template of filteredTemplates.value) {
		const source = template.descriptor.meta?.source || "未分类";
		if (!groups[source]) {
			groups[source] = [];
		}
		groups[source].push(template);
	}

	// 排序分组：角色技能、机会卡相关、system、其他
	const sortedGroups: Record<string, ModifierTemplate[]> = {};
	const groupOrder = ["角色技能", "机会卡", "system"];

	// 按预定顺序添加分组
	for (const key of groupOrder) {
		if (groups[key]) {
			sortedGroups[key] = groups[key];
		}
	}

	// 添加剩余分组（以"机会卡-"开头的放在一起）
	const remainingGroups: Record<string, ModifierTemplate[]> = {};
	const chanceCardGroups: Record<string, ModifierTemplate[]> = {};

	for (const [key, value] of Object.entries(groups)) {
		if (!sortedGroups[key]) {
			if (key.startsWith("机会卡-")) {
				chanceCardGroups[key] = value;
			} else if (key !== "未分类") {
				remainingGroups[key] = value;
			} else {
				sortedGroups[key] = value;
			}
		}
	}

	// 添加机会卡相关分组（按字母排序）
	for (const key of Object.keys(chanceCardGroups).sort()) {
		sortedGroups[key] = chanceCardGroups[key];
	}

	// 添加其他分组
	for (const key of Object.keys(remainingGroups).sort()) {
		sortedGroups[key] = remainingGroups[key];
	}

	return sortedGroups;
});

const commandTypeLabels: Record<string, string> = {
	"player.money.gain": "玩家获得金钱",
	"player.money.lose": "玩家失去金钱",
	"player.walk": "玩家行走",
	"player.tp": "玩家传送",
	"player.dice.roll": "玩家掷骰子",
	"player.dice.add": "玩家添加骰子",
	"player.dice.remove": "玩家移除骰子",
	"player.property.gain": "玩家获得地产",
	"player.property.lose": "玩家失去地产",
	"player.card.gain": "玩家获得机会卡",
	"player.card.lose": "玩家失去机会卡",
	"player.stop": "设置停止回合数",
	"player.round.start": "玩家回合开始",
	"player.round.end": "玩家回合结束",
	"player.round.skip": "玩家回合跳过",
	"player.bankrupted.set": "设置破产状态",
	"property.owner.change": "地产主人变更",
	"property.level.up": "地产升级",
	"property.level.down": "地产降级",
	"property.level.set": "地产等级设置",
	"property.arrived": "玩家到达地产",
};

/**
 * 新建修饰器模板
 */
function handleCreate() {
	const newTemplate: ModifierTemplate = {
		id: generateShortId("mod"),
		name: "新修饰器_" + Math.floor(Math.random() * 1000),
		slug: "",
		descriptor: {
			timing: "before",
			commandType: "",
			remainingTriggers: -1,
			priority: 0,
			autoConsume: true,
		},
		effectCode: "",
	};
	currentTemplate.value = newTemplate;
	editorVisible.value = true;
}

/**
 * 编辑修饰器模板
 */
function handleEdit(template: ModifierTemplate) {
	currentTemplate.value = JSON.parse(JSON.stringify(template));
	editorVisible.value = true;
}

/**
 * 删除修饰器模板
 */
function handleDelete(id: string) {
	mapStore.removeModifierTemplate(id);
	message.success("修饰器模板已删除");
}

/**
 * 保存修饰器模板
 */
function handleSave(template: ModifierTemplate) {
	mapStore.saveModifierTemplate(template);
	message.success("修饰器模板保存成功");
	closeEditor();
}

/**
 * 复制模板标识符
 */
async function copyModSlug(slug: string) {
	const text = `$mod__${slug}`;
	await navigator.clipboard.writeText(text);
	message.success(`已复制: ${text}`);
}

/**
 * 获取当前选中分类的显示标签
 */
function getSelectedCategoryLabel(): string {
	const catInfo = currentCategoryInfo.value;
	if (catInfo.type === "source") {
		return catInfo.value;
	}
	if (catInfo.type === "tag") {
		return `标签: ${catInfo.value}`;
	}
	return "全部";
}

function closeEditor() {
	editorVisible.value = false;
	currentTemplate.value = null;
}
</script>

<template>
	<a-modal
		v-model:open="model"
		title="修饰器模板管理器"
		width="100%"
		destroyOnClose
		:footer="null"
		wrap-class-name="modifier-template-manager-container"
	>
		<div class="manager-layout">
			<div class="library-view custom-scrollbar">
				<div class="library-header">
					<div class="header-left">
						<span class="count-text">共 {{ mapStore.modifierTemplates.length }} 个修饰器模板</span>
						<span v-if="selectedCategory !== 'all'" class="filter-text">
							· 已筛选: <a-tag color="blue" closable @close="selectedCategory = 'all'">{{ getSelectedCategoryLabel() }}</a-tag>
						</span>
					</div>
					<div class="header-right">
						<a-input-search
							v-model:value="searchText"
							placeholder="搜索名称、slug或命令类型"
							style="width: 250px; margin-right: 12px"
							allow-clear
						/>
						<a-button type="primary" @click="handleCreate"> + 新建修饰器 </a-button>
					</div>
				</div>

				<!-- 分类筛选器 -->
				<div class="category-filter">
					<div class="filter-section">
						<span class="filter-section-title">来源:</span>
						<a-radio-group v-model:value="selectedCategory" size="small">
							<a-radio-button value="all">全部</a-radio-button>
							<a-radio-button v-for="source in categories.sources" :key="source" :value="source">
								{{ source }}
							</a-radio-button>
						</a-radio-group>
					</div>
					<div v-if="categories.tags.length > 0" class="filter-section">
						<span class="filter-section-title">标签:</span>
						<div class="tag-pills">
							<a-tag
								v-for="tag in categories.tags"
								:key="tag"
								:checked="selectedCategory === tag"
								checkable
								@click="selectedCategory = selectedCategory === tag ? 'all' : tag"
							>
								{{ tag }}
							</a-tag>
						</div>
					</div>
				</div>

				<!-- 分组显示模板列表 -->
				<div v-if="Object.keys(groupedTemplates).length > 0" class="template-groups">
					<template v-for="(templates, groupKey) in groupedTemplates" :key="groupKey">
						<div v-if="templates.length > 0" class="template-group">
							<div v-if="groupKey" class="group-header">
								<span class="group-title">{{ groupKey }}</span>
								<span class="group-count">{{ templates.length }}</span>
							</div>
							<div class="card-grid">
								<div v-for="item in templates" :key="item.id" class="schema-card">
									<div class="card-info">
										<div class="card-name">{{ item.name }}</div>
										<div class="card-slug">{{ `$mod__${item.slug}` }}</div>
										<div class="card-meta">
											<span class="tag" :class="item.descriptor.timing">{{ item.descriptor.timing }}</span>
											<span class="command-type">{{ commandTypeLabels[item.descriptor.commandType] || item.descriptor.commandType || "未设置" }}</span>
										</div>
										<div class="card-tags" v-if="item.descriptor.meta?.tags?.length">
											<a-tag v-for="tag in item.descriptor.meta.tags" :key="tag" size="small" color="purple">{{ tag }}</a-tag>
										</div>
										<div class="card-id">ID: {{ item.id }}</div>
									</div>
									<div class="card-actions">
										<a-button size="small" @click="copyModSlug(item.slug)" :disabled="!item.slug">复制标识</a-button>
										<a-button size="small" @click="handleEdit(item)">编辑</a-button>
										<a-button size="small" danger @click="handleDelete(item.id)">删除</a-button>
									</div>
								</div>
							</div>
						</div>
					</template>
				</div>

				<!-- 空状态 -->
				<div v-else class="empty-state">
					{{ searchText ? "没有找到匹配的修饰器模板" : "暂无修饰器模板，请点击上方按钮创建" }}
				</div>
			</div>
		</div>
	</a-modal>

	<a-modal
		v-model:open="editorVisible"
		:title="isEditing ? '编辑修饰器模板' : '新建修饰器模板'"
		width="100%"
		centered
		destroyOnClose
		:footer="null"
		:mask-closable="false"
		class="editor-modal"
	>
		<ModifierTemplateEditor
			v-if="currentTemplate"
			:data="currentTemplate"
			@save="handleSave"
			@cancel="closeEditor"
		/>
	</a-modal>
</template>

<style lang="scss">
.modifier-template-manager-container {
	.ant-modal {
		max-width: 96vw;
		top: 5vh;
		padding-bottom: 0;
	}
	.ant-modal-content {
		display: flex;
		flex-direction: column;
		height: 90vh;
		overflow: hidden;
	}
	.ant-modal-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0;
	}
}

.manager-layout {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	border-radius: 10px;
}

.library-view {
	flex: 1;
	padding: 24px;
	overflow-y: auto;
	background: #f5f5f5;
}

.library-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	font-weight: bold;
	color: #666;

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;

		.count-text {
			color: #666;
		}

		.filter-text {
			color: #999;
			font-weight: normal;
		}
	}

	.header-right {
		display: flex;
		align-items: center;
	}
}

// 分类筛选器
.category-filter {
	background: #fff;
	padding: 12px 16px;
	border-radius: 8px;
	margin-bottom: 16px;
	border: 1px solid #e8e8e8;

	.filter-section {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;

		&:last-child {
			margin-bottom: 0;
		}

		.filter-section-title {
			font-size: 12px;
			color: #666;
			font-weight: 600;
			min-width: 40px;
		}

		.tag-pills {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;

			.anticon-close {
				font-size: 10px;
			}
		}
	}
}

// 模板分组
.template-groups {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.template-group {
	.group-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 2px solid #e8e8e8;

		.group-title {
			font-size: 16px;
			font-weight: 700;
			color: #333;
		}

		.group-count {
			font-size: 12px;
			color: #999;
			background: #f0f0f0;
			padding: 2px 8px;
			border-radius: 10px;
		}
	}
}

.card-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 16px;
}

.schema-card {
	background: #fff;
	border-radius: 8px;
	padding: 16px;
	border: 1px solid #e8e8e8;
	display: flex;
	justify-content: space-between;
	align-items: center;
	transition: all 0.2s;
	&:hover {
		border-color: #1890ff;
	}
}

.card-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.card-name {
	font-weight: 600;
	font-size: 16px;
	margin-bottom: 2px;
}

.card-slug {
	font-size: 12px;
	color: #58afff;
	font-weight: 600;
}

.card-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: #666;

	.tag {
		display: inline-block;
		padding: 1px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;

		&.before {
			background: #e6f7ff;
			color: #1890ff;
		}

		&.after {
			background: #f6ffed;
			color: #52c41a;
		}
	}

	.command-type {
		font-family: monospace;
	}
}

.card-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 2px;
}

.card-id {
	font-size: 12px;
	color: #999;
	font-family: monospace;
}

.card-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.empty-state {
	text-align: center;
	padding: 40px;
	color: #999;
}
</style>
