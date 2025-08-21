<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { CardUseMode } from "@src/enums/bace";
import { useSettig } from "@src/store";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { ref } from "vue";
import { useRoute } from "vue-router";

const settingVisible = ref(false);
const settingStore = useSettig();
const router = useRoute();
</script>

<template>
	<button @click="settingVisible = true" class="setting-button"><FontAwesomeIcon icon="gear" /></button>
	<FpDialog v-model:visible="settingVisible">
		<template #title>设置</template>
		<div class="setting-container">
			<div class="setting-list">
				<div class="setting-item">
					<div class="ban-mask" v-show="router.name === 'game'"><span>游戏中不能切换机会卡使用模式</span></div>
					<div class="label">机会卡使用</div>
					<div class="content">
						<div>
							<input
								type="radio"
								name="card-use-mode"
								:value="CardUseMode.Click"
								id="card-use-mode-click"
								v-model="settingStore.cardUseMode"
								hidden
							/>
							<label for="card-use-mode-click">
								<FontAwesomeIcon icon="square-check" v-if="settingStore.cardUseMode == CardUseMode.Click" />
								点击使用</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="card-use-mode"
								:value="CardUseMode.Drag"
								id="card-use-mode-drag"
								v-model="settingStore.cardUseMode"
								hidden
							/>
							<label for="card-use-mode-drag">
								<FontAwesomeIcon icon="square-check" v-if="settingStore.cardUseMode == CardUseMode.Drag" />
								拖动使用</label
							>
						</div>
					</div>
				</div>
				<div class="setting-item">
					<div class="label">音乐自动播放</div>
					<div class="content">
						<div>
							<input
								type="radio"
								name="auto-music-mode"
								:value="true"
								id="auto-music-mode-true"
								v-model="settingStore.autoMusic"
								hidden
							/>
							<label for="auto-music-mode-true">
								<FontAwesomeIcon icon="square-check" v-if="settingStore.autoMusic" />
								自动</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="auto-music-mode"
								:value="false"
								id="auto-music-mode-false"
								v-model="settingStore.autoMusic"
								hidden
							/>
							<label for="auto-music-mode-false">
								<FontAwesomeIcon icon="square-check" v-if="!settingStore.autoMusic" />
								手动</label
							>
						</div>
					</div>
				</div>

				<div class="setting-item">
					<div class="label">移动时视角</div>
					<div class="content">
						<div>
							<input
								type="radio"
								name="lock-role-mode"
								:value="true"
								id="lock-role-mode-true"
								v-model="settingStore.lockRole"
								hidden
							/>
							<label for="lock-role-mode-true">
								<FontAwesomeIcon icon="square-check" v-if="settingStore.lockRole" />
								锁定</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="lock-role-mode"
								:value="false"
								id="lock-role-mode-false"
								v-model="settingStore.lockRole"
								hidden
							/>
							<label for="lock-role-mode-false">
								<FontAwesomeIcon icon="square-check" v-if="!settingStore.lockRole" />
								自由</label
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.setting-button {
	height: 2.5rem;
	width: 2.5rem;
	border: 0.2rem solid rgba($color: #fff, $alpha: 0.75);
	border-radius: 0.5rem;
	font-size: 1.1rem;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
}
.setting-container {
	display: flex;
	align-items: center;
	// overflow-y: auto;
	color: var(--color-primary);

	& > .setting-list {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 0.8rem;

		& > .setting-item {
			display: flex;
			justify-content: center;
			font-size: 1.1rem;
			background-color: rgba(255, 255, 255, 0.75);
			border-radius: 0.5rem;
			padding: 0.8rem;
			box-sizing: border-box;
			box-shadow: var(--box-shadow);
			overflow: hidden;
			position: relative;

			& > div {
				display: inline-block;
			}

			& > .label {
				width: 30%;
				text-align: center;
			}
			& > .content {
				flex: 1;
				font-size: 1rem;
				display: flex;
				justify-content: space-around;
				align-items: center;

				& input[type="radio"]:checked + label {
					color: var(--color-primary);
				}

				& label {
					padding: 0.2rem;
					cursor: pointer;
					color: var(--color-third);
				}
			}

			.ban-mask {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background-color: rgba(255, 255, 255, 0.75);
				z-index: 100;
				display: flex;
				justify-content: center;
				align-items: center;
				color: #777777;
			}
		}
	}
}
</style>
