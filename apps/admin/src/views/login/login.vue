<script setup lang="ts">
import { ref, reactive, onBeforeMount } from "vue";
import router from "@/router";
import { apiLogin } from "@/utils/api/auth";
import { startTokenRefreshTimer } from "@/utils/axios";
import { isAdmin } from "@/utils/api/user";
import { getEncryptionKey } from "@/utils/auth";
import { message } from "ant-design-vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

onBeforeMount(() => {
	getEncryptionKey();
});

const isLoading = ref(false);
const loginForm = reactive({
	useraccount: "",
	password: "",
});

async function handleLogin() {
	isLoading.value = true;
	if (!loginForm.useraccount || !loginForm.password) {
		message.warning("请填写账号和密码");
		isLoading.value = false;
		return;
	}
	try {
		const token = await apiLogin(loginForm.useraccount, loginForm.password);
		if (token) {
			const { isAdmin: _isAdmin } = await isAdmin();
			if (!_isAdmin) {
				localStorage.removeItem("token");
				localStorage.removeItem("refreshToken");
				message.error("该账号不是管理员账号");
				return;
			}
			startTokenRefreshTimer();
			router.push({ name: "main" });
		}
	} finally {
		isLoading.value = false;
	}
}
</script>

<template>
	<div class="login-page">
		<div class="login-card">
			<h1 class="login-title">Mine Monopoly</h1>
			<p class="login-subtitle">管理后台</p>
			<form class="login-form" @submit.prevent="handleLogin">
				<div class="form-item">
					<label class="form-label" for="useraccount">账号</label>
					<input
						id="useraccount"
						v-model="loginForm.useraccount"
						class="form-input"
						type="text"
						autocomplete="off"
						placeholder="请输入账号"
					/>
				</div>
				<div class="form-item">
					<label class="form-label" for="password">密码</label>
					<input
						id="password"
						v-model="loginForm.password"
						class="form-input"
						type="password"
						autocomplete="off"
						placeholder="请输入密码"
					/>
				</div>
				<button class="submit-button" type="submit" :disabled="isLoading">
					<FontAwesomeIcon v-if="isLoading" icon="spinner" spin />
					<span v-else>登录</span>
				</button>
			</form>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.login-page {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, var(--color-bg-light) 0%, var(--color-bg) 100%);
}

.login-card {
	width: 360px;
	padding: 2.5rem 2rem;
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.85);
	box-shadow: var(--box-shadow);
}

.login-title {
	font-size: 1.5rem;
	color: var(--color-primary);
	text-align: center;
	margin-bottom: 0.25rem;
}

.login-subtitle {
	text-align: center;
	color: var(--color-text-second);
	font-size: 0.85rem;
	margin-bottom: 1.5rem;
}

.login-form {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.form-item {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
}

.form-label {
	font-size: 0.85rem;
	color: var(--color-text-second);
}

.form-input {
	height: 2.4rem;
	padding: 0 0.75rem;
	border-radius: 6px;
	border: 1px solid #dcdfe6;
	font-size: 0.95rem;
	outline: none;
	transition: border-color 0.2s;

	&:focus {
		border-color: var(--color-second);
	}

	&::placeholder {
		color: #c0c4cc;
	}
}

.submit-button {
	width: 100%;
	height: 2.5rem;
	border: none;
	border-radius: 6px;
	background-color: var(--color-second);
	color: var(--color-text-white);
	font-size: 1rem;
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover:not(:disabled) {
		background-color: var(--color-primary-110);
	}

	&:disabled {
		cursor: not-allowed;
		background-color: var(--color-bg-disable);
	}
}
</style>
