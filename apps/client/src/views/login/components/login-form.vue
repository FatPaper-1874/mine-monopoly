<script setup lang="ts">
import { apiLogin, apiRegister, getPublicKey } from "@src/utils/api/auth";
import { ref, reactive, onBeforeMount } from "vue";
import { FPMessage } from "@mine-monopoly/ui";
import { getEncryption } from "@src/utils/encryption";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

onBeforeMount(() => {
	getPublicKey();
});

const isLoading = ref(false);
const avatarFile = ref<File | undefined>();
const colorInputRef = ref<HTMLInputElement | null>(null);
const emit = defineEmits(["success", "error", "close"]);

const loginForm = reactive({
	useraccount: "",
	password: "",
});

const registerForm = reactive({
	useraccount: "",
	username: "",
	password: "",
	confirmPassword: "",
	avatar: "",
	color: "#000000",
});

function handleFileChange(event: Event) {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];

	if (file) {
		avatarFile.value = file;
		const reader = new FileReader();
		reader.onload = (e) => {
			registerForm.avatar = (e.target?.result as string) || "";
		};
		reader.readAsDataURL(file);
	} else {
		registerForm.avatar = "";
	}
}

function resetRegisterForm() {
	registerForm.useraccount = "";
	registerForm.username = "";
	registerForm.password = "";
	registerForm.confirmPassword = "";
	registerForm.avatar = "";
	registerForm.color = "#000000";
}

const handleRegister = async () => {
	isLoading.value = true;
	if (
		!(
			registerForm.avatar &&
			registerForm.useraccount &&
			registerForm.username &&
			registerForm.password &&
			registerForm.confirmPassword
		)
	) {
		FPMessage({
			type: "warning",
			message: "表单没填完 我怎么帮你注册😡",
		});
		isLoading.value = false;
		return;
	}
	if (registerForm.password === registerForm.confirmPassword) {
		const formData = new FormData();
		const epassword = await getEncryption(registerForm.password);
		if (epassword && avatarFile.value) {
			formData.append("avatar", avatarFile.value);
			formData.append("useraccount", registerForm.useraccount);
			formData.append("username", registerForm.username);
			formData.append("password", epassword.toString());
			formData.append("color", registerForm.color);
			try {
				if (await apiRegister(formData)) {
					loginForm.useraccount = registerForm.useraccount;
					resetRegisterForm();
					loginMode.value = true;
				}
			} finally {
				isLoading.value = false;
			}
		}
	} else {
		FPMessage({
			type: "error",
			message: "两次输入的密码不一样",
		});
		registerForm.confirmPassword = "";
	}
	isLoading.value = false;
};

async function handleLogin() {
	isLoading.value = true;
	if (!(loginForm.useraccount && loginForm.password)) {
		FPMessage({
			type: "warning",
			message: "表单没填完 你想怎么登录😡",
		});
		isLoading.value = false;
		return;
	}
	try {
		const token = await apiLogin(loginForm.useraccount, loginForm.password);
		if (token) {
			emit("success", token);
		}
	} finally {
		isLoading.value = false;
	}
}

const loginMode = ref(true);

function handleColorClick() {
	colorInputRef.value?.click();
}
</script>

<template>
	<div v-if="loginMode" class="login-form">
		<div class="form-item">
			<span class="lable">账号</span>
			<input autocomplete="off" class="fp-input" type="text" id="useraccount" v-model="loginForm.useraccount" />
		</div>
		<div class="form-item">
			<span class="lable">密码</span>
			<input autocomplete="off" class="fp-input" type="password" id="password" v-model="loginForm.password" />
		</div>

		<div class="tip">
			<span>没有账号？点击<span @click="loginMode = false">注册</span></span>
		</div>

		<button :disabled="isLoading" @click="handleLogin" class="submit-button">
			<FontAwesomeIcon v-if="isLoading" icon="spinner" spin />
			<span v-else>登录</span>
		</button>
	</div>

	<div v-else class="register-form">
		<div class="avatar_user-container">
			<div class="form-item">
				<span class="lable">头像</span>
				<label for="avatar">
					<div class="avatar_preview-container">
						<img v-if="registerForm.avatar" class="avatar_preview" :src="registerForm.avatar" />
					</div>
				</label>
				<input
					style="display: none"
					@change="handleFileChange"
					id="avatar"
					accept=".png,.jpg,.jpeg"
					class="fp-input avatar"
					type="file"
				/>
			</div>
			<div class="form-item">
				<span class="lable">用户名</span>
				<input autocomplete="off" class="fp-input" type="text" id="username" v-model="registerForm.username" />
			</div>
		</div>
		<div class="form-item">
			<span class="lable">账号(用于登录)</span>
			<input autocomplete="off" class="fp-input" type="text" id="useraccount" v-model="registerForm.useraccount" />
		</div>
		<div class="form-item">
			<span class="lable">密码</span>
			<input autocomplete="off" class="fp-input" type="password" id="password" v-model="registerForm.password" />
		</div>
		<div class="form-item">
			<span class="lable">确认密码</span>
			<input
				autocomplete="off"
				class="fp-input"
				type="password"
				id="confirmPassword"
				v-model="registerForm.confirmPassword"
			/>
		</div>
		<div class="form-item">
			<span class="lable">代表颜色</span>
			<div class="color-input-wrapper">
				<input
					ref="colorInputRef"
					type="color"
					id="color"
					v-model="registerForm.color"
					class="color-input-hidden"
				/>
				<div class="color-preview" :style="{ backgroundColor: registerForm.color }" @click="handleColorClick">
					<span class="color-value">{{ registerForm.color }}</span>
				</div>
			</div>
		</div>

		<div class="tip">
			<span>已有账号？点击<span @click="loginMode = true">登录</span></span>
		</div>

		<button :disabled="isLoading" @click="handleRegister" class="submit-button">
			<FontAwesomeIcon v-if="isLoading" icon="spinner" spin />
			<span v-else>注册</span>
		</button>
	</div>
</template>

<style lang="scss" scoped>
.form-item {
	display: flex;
	flex-direction: column;

	input {
		width: 100%;
		margin: 0.3rem 0;
		height: 2.5rem;
		font-size: 1.2rem;
		color: var(--color-primary);
	}

	#color {
		padding: 0.3rem 0.7rem;
	}

	.color-input-wrapper {
		display: flex;
		align-items: center;
		width: 100%;
		margin: 0.3rem 0;

		.color-input-hidden {
			position: absolute;
			width: 0;
			height: 0;
			opacity: 0;
			pointer-events: none;
		}

		.color-preview {
			width: 100%;
			height: 3rem;
			border-radius: 0.5rem;
			border: 0.15rem solid rgba(255, 255, 255, 0.3);
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s;
			box-shadow: 0 0.1rem 0.3rem rgba(0, 0, 0, 0.1);
			cursor: pointer;

			.color-value {
				font-size: 0.9rem;
				color: #333;
				font-weight: 500;
				text-transform: uppercase;
			}
		}
	}

	span.lable {
		display: block;
		font-size: 1rem;
		margin-bottom: 0;
		color: var(--color-primary);
	}
}

.login-form,
.register-form {
	position: relative;
}

.mode_tag {
	height: 2.8rem;
	position: absolute;
	left: 50%;
	top: 0;
	transform: translate(-50%, -50%);
	z-index: 10;
	margin: 0;
	font-size: 1.8rem;
	background-color: var(--color-primary);
	display: flex;
	text-align: center;
	align-items: center;
	color: #ffffff;
	border-radius: 0.5rem;
	padding: 0.2rem 1rem;
	user-select: none;
	box-shadow: var(--box-shadow);
}

.tip {
	text-align: right;
	margin: 0 0.5rem 1rem 0;

	& > span {
		margin-left: auto;
		font-size: 0.8rem;
		color: var(--color-text-second);
		user-select: none;

		& > span {
			color: var(--color-primary);
			border-bottom: 0.1rem solid var(--color-primary);
			cursor: pointer;
		}
	}
}

.login-form {
	width: 26rem;

	& input {
		height: 3rem;
	}

	& span.lable {
		font-size: 1rem;
	}

	& > .form-item {
		margin: 0.5rem 0;
	}

	& > .submit-button {
		width: 100%;
		padding: 0.6rem;
		border-radius: 0.8rem;
		font-size: 1.6rem;
	}
}

.register-form {
	$avatar_size: 4rem;
	width: 26rem;

	& #username {
		height: $avatar_size;
		font-size: calc($avatar_size / 2);
		border-radius: 1.2rem;
		padding: 0 0.8rem;
	}

	& > .avatar_user-container {
		display: flex;

		& .avatar_preview-container {
			width: $avatar_size;
			height: $avatar_size;
			border-radius: 1rem;
			border: 0.3rem solid rgba(255, 255, 255);
			background-color: rgba(255, 255, 255, 0.8);
			margin-right: 0.6rem;
			margin-top: 0.3rem;
			cursor: pointer;
			overflow: hidden;
			box-sizing: border-box;

			& > img {
				width: 100%;
				height: 100%;
			}
		}

		& > div {
			display: flex;
			flex-direction: column;
		}
	}

	& > .form-item,
	& > .tip {
		margin: 0.4rem 0;
	}

	& > .submit-button {
		width: 100%;
		padding: 0.4rem;
		border-radius: 0.8rem;
		font-size: 1.4rem;
	}
}
</style>
