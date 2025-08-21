<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { CardUseMode } from "@src/enums/bace";
import { useSettig } from "@src/store";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { ref } from "vue";
import { useRoute } from "vue-router";

const helpVisible = ref(false);
const router = useRoute();
</script>

<template>
	<button @click="helpVisible = true" class="help-button"><FontAwesomeIcon icon="question" /></button>
	<FpDialog :style="'width: 70%; height: 70%;'" v-model:visible="helpVisible">
		<template #title>帮助 / Tips</template>
		<div class="help-container">
			<h3>Room-Router</h3>
			<p>-输入房间号即可创建/加入房间, 第一个使用房间号的人将成为房主(主机), 建议设备配置较高的玩家当主机;</p>
			<p>-点击中间的按钮可随机匹配公开的房间;</p>

			<h3>房间</h3>
			<p>-点击房间ID可以复制ID到剪贴板;</p>
			<p>-可根据喜好调整地图参数设置;</p>
			<p>-在角色卡片上有修改颜色按钮, 选一个喜欢的颜色吧;</p>
			<p>-选择地图后, 所有玩家准备就绪(一个人也可以开始), 即可开始游戏;</p>

			<h3>游戏中</h3>
			<p>-PC端左键拖动/移动端单指拖动可以旋转视角、PC端右键拖动/移动端双指拖动可以移动摄像机位置;</p>
			<p>-目前游戏目标为: "赚够目标金额" 或者 "只剩一个人没有破产";</p>
			<p>-在你的回合中可以使用一张机会卡, 机会卡上限为4张, 超量获得的机会卡将销毁;</p>
			<p>-在过路费上涨的回合会每人发一张机会卡喔, 尽情使用机会卡, 留一个位置给系统奖励吧;</p>
			<p>
				-掷骰子将结束你的回合, 并根据点数进行移动, 到目的地后会触发买地/升级房屋等操作, 当走到有图标的地块时,
				会触发对应效果;
			</p>
			<p>-有些机会卡会有持续效果, 点击自己/别人的卡片看看吧;</p>
			<p>-持续效果的生效机制是: 后来先触发(就是最后挂上的效果最先触发, 相似的数据结构为"栈")</p>
			<p>-像有关于走路、获得金钱、失去金钱等持续效果, 在多种效果叠加时会将效果进行的结果传递下去;</p>
			<p>-玩的开心 :D</p>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.help-button {
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
.help-container {
	h3 {
		color: var(--color-primary);
	}

	p {
		color: #3e3e3e;
	}
	// display: flex;
	// align-items: center;
	// overflow-y: auto;
}
</style>
