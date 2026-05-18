<script setup lang="ts">
import { menus } from "../router/menus";
import { computed, onBeforeMount, ref } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { isAdmin } from "@/utils/api/user";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";

const router = useRouter();
const currentRoutePath = computed(() => router.currentRoute.value.path);

const currentPageIndex = ref<string[]>([currentRoutePath.value]);
const mobileMenuOpen = ref(false);

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
	mobileMenuOpen.value = false;
	router.push(path);
}

function handleLogout() {
	localStorage.removeItem("token");
	mobileMenuOpen.value = false;
	router.replace({ name: "login"});
}
</script>

<template>
	<a-layout class="main-page">
		<!-- 桌面端侧边栏 -->
		<a-layout-sider class="sider desktop-sider" theme="light" width="200">
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

		<!-- 移动端菜单抽屉 -->
		<a-drawer
			v-model:open="mobileMenuOpen"
			placement="left"
			:width="200"
			:closable="false"
			:body-style="{ padding: 0 }"
		>
			<div class="mobile-menu">
				<div class="logo">
					<span>大富翁控制台</span>
					<button @click="mobileMenuOpen = false" class="close-btn">
						<font-awesome-icon :icon="['fas', 'xmark']" />
					</button>
				</div>
				<a-menu v-model:selectedKeys="currentPageIndex" theme="light" :style="{ lineHeight: '64px' }">
					<a-menu-item class="menu-item" @click="routeTo(menu.path)" v-for="menu in menus" :key="menu.path">
						<font-awesome-icon :icon="['fas', menu.icon]" class="icon" />
						<span>{{ menu.menuName }}</span>
					</a-menu-item>
					<a-menu-item class="menu-item" @click="handleLogout">
						<font-awesome-icon :icon="['fas', 'right-from-bracket']" class="icon" />
						<span>退出登录</span>
					</a-menu-item>
				</a-menu>
			</div>
		</a-drawer>

		<a-layout-content class="content-area">
			<div class="mobile-header">
				<button @click="mobileMenuOpen = true" class="menu-trigger">
					<font-awesome-icon :icon="['fas', 'bars']" />
				</button>
				<span class="header-title">大富翁控制台</span>
			</div>
			<div class="content-wrapper">
				<router-view></router-view>
			</div>
		</a-layout-content>
	</a-layout>
</template>

<style lang="scss" scoped>
.main-page {
	width: 100%;
	height: 100%;

	.desktop-sider {
		display: none;
	}

	.mobile-header {
		display: flex;
		align-items: center;
		padding: 12px 16px;
		background-color: #3689ff;
		color: #ffffff;

		.menu-trigger {
			background: rgba(255, 255, 255, 0.15);
			border: none;
			color: #ffffff;
			font-size: 18px;
			cursor: pointer;
			padding: 8px 12px;
			border-radius: 4px;
			min-width: 40px;
			min-height: 40px;
			display: flex;
			align-items: center;
			justify-content: center;

			&:hover {
				opacity: 0.8;
			}
		}

		.header-title {
			flex: 1;
			text-align: center;
			font-weight: bold;
			font-size: 1.1em;
			margin-right: 32px;
		}
	}

	.content-wrapper {
		padding: 16px;
	}

	.content-area {
		overflow-y: auto;
		height: 100%;
	}

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

@media (min-width: 992px) {
	.main-page {
		.desktop-sider {
			display: block;
		}

		.mobile-header {
			display: none;
		}

		.content-wrapper {
			padding: 0;
		}
	}
}
</style>

<style lang="scss">
// 移动端抽屉菜单样式（非 scoped）
.mobile-menu {
	height: 100%;

	.logo {
		width: 100%;
		height: 45px;
		margin: 0;
		background-color: #3689ff;
		border-radius: 0;
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

		.close-btn {
			cursor: pointer;
			height: 100%;
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 0 13px;
			background-color: #589eff;
			color: #ffffff;
			border: none;

			&:hover {
				background-color: #ff4d4f;
			}
		}
	}
}

.mobile-menu .menu-item {
	span {
		margin-left: 10px;
	}
	.icon {
		width: 20px;
	}
}
</style>
