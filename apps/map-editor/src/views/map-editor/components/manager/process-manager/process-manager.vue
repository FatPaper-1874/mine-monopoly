<script setup lang="ts">
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "@src/components/code-editor/editor-lib.d.ts?raw";
import { GAME_PHASE_TEMPLATE as TemplateText } from "@src/components/code-editor/code-templates";
import { computed, ref } from "vue";
import { useMapDataStore } from "@src/stores";
import { GamePhaseInfo } from "@mine-monopoly/types";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { generateShortId } from "@src/utils/short-id";


const model = defineModel({ default: false });
const mapDataStore = useMapDataStore();

const phases = computed(() => mapDataStore.phases);

type PhaseGroupKey = keyof typeof mapDataStore.phases;

// 当前选中的分组 & 索引
const currentGroupKey = ref<PhaseGroupKey>("gameRoundStart");
const currentIndex = ref(0);

// 当前正在编辑的 phase，双向绑定
const currentPhase = computed<GamePhaseInfo | null>({
	get: () => {
		const list = phases.value[currentGroupKey.value];
		return list?.[currentIndex.value] ?? null;
	},
	set: (val) => {
		if (val) {
			mapDataStore.phases[currentGroupKey.value][currentIndex.value] = val;
		}
	},
});

function addPhase(group: PhaseGroupKey, insertIndex: number) {
	const newPhase: GamePhaseInfo = {
		id: generateShortId('phase'),
		name: "新阶段",
		description: "新阶段",
		from: undefined,
		initEventCode: `(async (context, gameProcess) => {

}) as GameEventFunction<GameContext>;`,
	};
	mapDataStore.phases[group].splice(insertIndex + 1, 0, newPhase);
	currentGroupKey.value = group;
	currentIndex.value = insertIndex + 1;
}

function removePhase(group: PhaseGroupKey, id: string) {
	const deleteIndex = mapDataStore.phases[group].findIndex((p) => p.id === id);
	mapDataStore.phases[group].splice(deleteIndex, 1);
}
</script>

<template>
	<a-modal
		wrap-class-name="process-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="流程编辑"
	>
		<div class="process-container">
			<!-- 游戏结束判定规则 -->
			<h4>游戏结束判定规则</h4>
			<div class="phase-container">
				<div class="phase-item" v-for="(phase, index) in phases.gameOverRule">
					<a-card
						:key="phase.id"
						class="process-card"
						hoverable
						:class="{ selected: currentGroupKey === 'gameOverRule' && index === currentIndex }"
						@click="
							currentGroupKey = 'gameOverRule';
							currentIndex = index;
						"
						size="small"
						:title="phase.name"
					>
						{{ phase.description }}
					</a-card>
				</div>
			</div>

			<!-- 玩家预初始化阶段 -->
			<h4>玩家预初始化（在玩家初始化之前运行）</h4>
			<div class="phase-container">
				<div class="phase-item" v-for="(phase, index) in phases.playerPreInit">
					<a-card
						:key="phase.id"
						class="process-card"
						hoverable
						:class="{ selected: currentGroupKey === 'playerPreInit' && index === currentIndex }"
						@click="
							currentGroupKey = 'playerPreInit';
							currentIndex = index;
						"
						size="small"
						:title="phase.name"
					>
						<template v-if="phase.mark == undefined && phase.from !== '系统'" #extra>
							<a-button size="small" type="link" danger @click="removePhase('playerPreInit', phase.id)">删除</a-button>
						</template>
						{{ phase.description }}
					</a-card>
					<a-button type="dashed" @click="addPhase('playerPreInit', index)" class="add-phase-button">
						<FontAwesomeIcon :icon="['fas', 'plus']" />
					</a-button>
				</div>
			</div>

			<!-- 地皮预初始化阶段 -->
			<h4>地皮预初始化（在地皮初始化之前运行）</h4>
			<div class="phase-container">
				<div class="phase-item" v-for="(phase, index) in phases.propertyPreInit">
					<a-card
						:key="phase.id"
						class="process-card"
						hoverable
						:class="{ selected: currentGroupKey === 'propertyPreInit' && index === currentIndex }"
						@click="
							currentGroupKey = 'propertyPreInit';
							currentIndex = index;
						"
						size="small"
						:title="phase.name"
					>
						<template v-if="phase.mark == undefined && phase.from !== '系统'" #extra>
							<a-button size="small" type="link" danger @click="removePhase('propertyPreInit', phase.id)">删除</a-button>
						</template>
						{{ phase.description }}
					</a-card>
					<a-button type="dashed" @click="addPhase('propertyPreInit', index)" class="add-phase-button">
						<FontAwesomeIcon :icon="['fas', 'plus']" />
					</a-button>
				</div>
			</div>

			<!-- 游戏初始化后阶段 -->
			<h4>游戏基础内容初始化后</h4>
			<div class="phase-container">
				<div class="phase-item" v-for="(phase, index) in phases.gameInited">
					<a-card
						:key="phase.id"
						class="process-card"
						hoverable
						:class="{ selected: currentGroupKey === 'gameInited' && index === currentIndex }"
						@click="
							currentGroupKey = 'gameInited';
							currentIndex = index;
						"
						size="small"
						:title="phase.name"
					>
						<template v-if="phase.mark == undefined" #extra>
							<a-button size="small" type="link" danger @click="removePhase('gameInited', phase.id)">删除</a-button>
						</template>
						{{ phase.description }}
					</a-card>
					<a-button type="dashed" @click="addPhase('gameInited', index)" class="add-phase-button">
						<FontAwesomeIcon :icon="['fas', 'plus']" />
					</a-button>
				</div>
			</div>

			<!-- 存档恢复后阶段 -->
			<h4>存档恢复后（仅在读取存档时执行一次）</h4>
			<div class="phase-container">
				<div class="phase-item" v-for="(phase, index) in phases.postRestore">
					<a-card
						:key="phase.id"
						class="process-card"
						hoverable
						:class="{ selected: currentGroupKey === 'postRestore' && index === currentIndex }"
						@click="
							currentGroupKey = 'postRestore';
							currentIndex = index;
						"
						size="small"
						:title="phase.name"
					>
						<template v-if="phase.mark == undefined && phase.from !== '系统'" #extra>
							<a-button size="small" type="link" danger @click="removePhase('postRestore', phase.id)">删除</a-button>
						</template>
						{{ phase.description }}
					</a-card>
					<a-button type="dashed" @click="addPhase('postRestore', index)" class="add-phase-button">
						<FontAwesomeIcon :icon="['fas', 'plus']" />
					</a-button>
				</div>
			</div>

			<!-- 轮次循环区域 -->
			<h4>轮次循环区域</h4>
			<div class="phase-container round-phase">
				<!-- 轮次开始阶段 -->
				<div class="round-section">
					<h5>轮次开始阶段</h5>
					<div class="phase-item" v-for="(phase, index) in phases.gameRoundStart">
						<a-card
							:key="phase.id"
							class="process-card"
							hoverable
							:class="{ selected: currentGroupKey === 'gameRoundStart' && index === currentIndex }"
							@click="
								currentGroupKey = 'gameRoundStart';
								currentIndex = index;
							"
							size="small"
							:title="phase.name"
						>
							<template v-if="phase.mark == undefined" #extra>
								<a-button size="small" type="link" danger @click="removePhase('gameRoundStart', phase.id)">删除</a-button>
							</template>
							{{ phase.description }}
						</a-card>
						<a-button type="dashed" @click="addPhase('gameRoundStart', index)" class="add-phase-button">
							<FontAwesomeIcon :icon="['fas', 'plus']" />
						</a-button>
					</div>
				</div>

				<!-- 玩家回合阶段 -->
				<div class="round-section">
					<h5>玩家回合阶段(遍历每个玩家)</h5>
					<div class="phase-container player-phase">
						<a-button type="dashed" @click="addPhase('playerRound', -1)" class="add-phase-button">
							<FontAwesomeIcon :icon="['fas', 'plus']" />
						</a-button>
						<div class="phase-item" v-for="(phase, index) in phases.playerRound">
							<a-card
								:key="phase.id"
								class="process-card"
								hoverable
								:class="{ selected: currentGroupKey === 'playerRound' && index === currentIndex }"
								@click="
									currentGroupKey = 'playerRound';
									currentIndex = index;
								"
								size="small"
								:title="phase.name"
							>
								<template v-if="phase.mark == undefined" #extra>
									<a-button size="small" type="link" danger @click="removePhase('playerRound', phase.id)">删除</a-button>
								</template>
								{{ phase.description }}
							</a-card>
							<a-button type="dashed" class="add-phase-button" @click="addPhase('playerRound', index)">
								<FontAwesomeIcon :icon="['fas', 'plus']" />
							</a-button>
						</div>
					</div>
				</div>

				<!-- 轮次结束阶段 -->
				<div class="round-section">
					<h5>轮次结束阶段</h5>
					<div class="phase-item" v-for="(phase, index) in phases.gameRoundEnd">
						<a-button type="dashed" class="add-phase-button" @click="addPhase('gameRoundEnd', index - 1)">
							<FontAwesomeIcon :icon="['fas', 'plus']" />
						</a-button>
						<a-card
							:key="phase.id"
							class="process-card"
							hoverable
							:class="{ selected: currentGroupKey === 'gameRoundEnd' && index === currentIndex }"
							@click="
								currentGroupKey = 'gameRoundEnd';
								currentIndex = index;
							"
							size="small"
							:title="phase.name"
						>
							<template v-if="phase.mark == undefined" #extra>
								<a-button size="small" type="link" danger @click="removePhase('gameRoundEnd', phase.id)">删除</a-button>
							</template>
							{{ phase.description }}
						</a-card>
					</div>
				</div>
			</div>
		</div>

		<div class="editor-container">
			<div class="phase-form">
				<a-form v-if="currentPhase" :model="currentPhase" name="phase" layout="inline">
					<a-form-item label="阶段名称" name="name" :rules="[{ required: true, message: '输入阶段名称' }]">
						<a-input v-model:value="currentPhase.name" />
					</a-form-item>

					<a-form-item label="阶段描述" name="description" :rules="[{ required: true, message: '输入阶段描述' }]">
						<a-input v-model:value="currentPhase.description" />
					</a-form-item>
				</a-form>
			</div>
			<a-alert
				message="此处编写的是游戏阶段的初始代码，在游戏初始化时会注册这些代码到响应的游戏阶段，游戏进行到相应阶段就会运行下面的代码；你可以点击左边“+”号按钮添加任意阶段"
				type="info"
				show-icon
			/>
			<CodeEditor
				v-if="currentPhase"
				v-model="currentPhase.initEventCode"
				:static-types="libContent"
				:template-text="TemplateText"
			/>
		</div>
	</a-modal>
</template>

<style lang="scss">
.process-manager-container {
	.ant-modal {
		max-width: 96vw;
		top: 10vh;
		left: 2vw;
		padding-bottom: 0;
		margin: 0;
	}
	.ant-modal-content {
		display: flex;
		flex-direction: column;
		height: calc(85vh);
	}
	.ant-modal-body {
		flex: 1;
		display: flex;
		height: 40vh;
	}

	.process-container {
		width: 30vw;
		height: 100%;
		overflow-y: scroll;
		padding: 10px 0;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-right: 10px;

		h4 {
			margin: 10px 0 5px;
			color: #555;
		}

		h5 {
			margin: 8px 0 5px;
			color: #666;
			font-size: 0.9em;
			font-weight: 600;
		}

		.phase-container {
			width: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 10px;
			margin: 5px 0;
		}

		.phase-container.player-phase {
			width: fit-content;
			border: 2px dashed #93c0ff;
			border-radius: 10px;
			padding: 10px;
			background-color: rgba(147, 192, 255, 0.15);
		}

		.phase-container.round-phase {
			width: fit-content;
			border: 2px dashed #ff9800;
			border-radius: 15px;
			padding: 15px;
			background-color: rgba(255, 152, 0, 0.05);
			display: flex;
			flex-direction: column;
			gap: 15px;
		}

		.round-section {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8px;
		}
	}

	.phase-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.process-card {
		box-sizing: border-box;
		width: 20vw;
		font-size: 0.8em;
		border: 2px solid #c2c2c2;

		&.selected {
			border: 2px solid #1677ff;
		}
	}
	.add-phase-button {
		width: 100%;
	}

	.editor-container {
		height: 100%;
		flex: 1;
		gap: 10px;
		display: flex;
		flex-direction: column;
	}
}
</style>
