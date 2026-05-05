<script setup lang="ts">
import { menus } from "../router/menus";
import { computed, onBeforeMount, ref, watch } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { isAdmin } from "@/utils/api/user";
import { useRouter } from "vue-router";
import { isMobileDevice } from "../utils/index";
import { message } from "ant-design-vue";
import { MenuClickEventHandler, MenuInfo } from "ant-design-vue/es/menu/src/interface";

const router = useRouter();
const currentRoutePath = computed(() => router.currentRoute.value.path);

const currentPageIndex = ref<string[]>([currentRoutePath.value]);

onBeforeMount(async () => {
	const token = localStorage.getItem("token");
	if (token) {
		const { isAdmin: _isAdmin } = await isAdmin();
		if (!_isAdmin) {
			message.error("该账号不是管理员账号！请重新登录");
			router.replace("/login");
		}
	} else {
		router.replace("/login");
	}
});

function routeTo(path: string) {
	router.push(path);
}

function handleLogout() {
	localStorage.removeItem("token");
	router.replace({ name: "login" });
}
</script>

<template>
	<a-layout class="main-page">
		<a-layout-sider class="sider" theme="light" breakpoint="lg" collapsed-width="0">
			<div class="logo">
				<span>大富翁控制台</span>
				<button @click="handleLogout" class="logout">
					<font-awesome-icon :icon="['fas', 'right-from-bracket']" />
				</button>
			</div>
			<a-menu v-model:selectedKeys="currentPageIndex" theme="light" :style="{ lineHeight: '64px' }">
				<a-menu-item class="menu-item" @click="routeTo(menu.path)" v-for="menu in menus" :key="menu.path">
					<font-awesome-icon :icon="['fas', menu.icon]" class="icon" />
					<span>{{ menu.menuName }}</span>
				</a-menu-item>
			</a-menu>
		</a-layout-sider>
		<a-layout-content>
			<router-view></router-view>
		</a-layout-content>
	</a-layout>
</template>

<style lang="scss" scoped>
.main-page {
	width: 100%;
	height: 100%;

	.logo {
		width: 90%;
		height: 45px;
		margin: 10px auto;
		background-color: #3689ff;
		border-radius: 10px;
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #ffffff;
		overflow: hidden;
		word-break: keep-all;

		span {
			display: block;
			font-size: 1.3em;
			font-weight: bold;
			flex: 1;
			text-align: center;
			margin-bottom: 0.1em;
		}

		.logout {
			cursor: pointer;
			height: 100%;
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 0 13px;
			background-color: #589eff;
			color: #ffffff;

			&:hover {
				background-color: #ff4d4f;
			}
		}
	}

	.menu-item {
		span {
			margin-left: 10px;
		}
		.icon {
			width: 20px;
		}
	}
}
</style>
