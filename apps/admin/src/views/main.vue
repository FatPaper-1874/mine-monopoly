<script setup lang="ts">
import { menus } from "../router/menus";
import { computed, onBeforeMount } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { isAdmin } from "@/utils/api/user";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";
import { isMobileDevice } from "../utils/index";

const router = useRouter();
const currentRoutePath = computed(() => router.currentRoute.value.path);

const isMobile = isMobileDevice();

onBeforeMount(async () => {
	const token = localStorage.getItem("token");
	if (token) {
		const { isAdmin: _isAdmin } = await isAdmin();
		if (!_isAdmin) {
			ElMessage({ message: "该账号不是管理员账号！请重新登录", type: "error" });
			router.replace("/login");
		}
	} else {
		router.replace("/login");
	}
});

function handleLogout() {
	localStorage.removeItem("token");
	router.replace({ name: "login" });
}
</script>

<template>
	<el-container class="main-page">
		<el-header class="top-bar" height="50px">
			<h3 style="display: inline-block">FatPaper大富翁总控中心</h3>
			<el-button type="danger" plain @click="handleLogout">登出</el-button>
		</el-header>

		<el-container :direction="isMobile ? 'vertical' : 'horizontal'">
			<el-aside class="menu-container" :style="{ width: isMobile ? '100%' : '240px' }">
				<el-menu
					text-color="#4e4e4e"
					:mode="isMobile ? 'horizontal' : 'vertical'"
					router
					:default-active="currentRoutePath"
				>
					<el-menu-item v-for="item in menus" :index="item.path">
						<FontAwesomeIcon class="icon" :icon="item.icon"></FontAwesomeIcon>
						<span>{{ item.menuName }}</span>
					</el-menu-item>
				</el-menu>
			</el-aside>

			<el-main
				class="router-view-container"
				:style="{ maxHeight: isMobile ? 'calc(100vh - 110px)' : 'calc(100vh - 50px)' }"
			>
				<router-view></router-view>
			</el-main>
		</el-container>
	</el-container>
</template>

<style lang="scss" scoped>
.main-page {
	width: 100%;
	height: 100%;

	& > .top-bar {
		background-color: var(--el-color-primary);
		box-shadow: var(--el-box-shadow-lighter);

		display: flex;
		justify-content: space-between;
		align-items: center;
		line-height: 50px;
		color: #ffffff;
	}
}

.menu-container {
	box-shadow: var(--el-box-shadow-lighter);

	.icon {
		width: 1.5rem;
	}
}
</style>
