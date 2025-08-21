<script setup lang="ts">
import { User } from "@/interfaces/interfaces";
import { ref, onMounted, reactive, toRaw } from "vue";
import { getUserList, createUser, updateUser, deleteUser } from "@/utils/api/user";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { ElMessageBox } from "element-plus";

const currentPage = ref(1);
const totalPage = ref(0);
const size = ref(8);
const isLoading = ref(true);

const _userList = ref<User[]>([]);

const _userForm = reactive({
	username: "",
	password: "",
	avatar: "",
	color: "",
});

const _dialogVisible = ref(false);

const _currentUserId = ref("");

function handleCurrentChange(){};

function handleUserEdit(user: User){
	_dialogVisible.value = true;
	_currentUserId.value = user.id;
	_userForm.username = user.username;
	_userForm.password = "";
	_userForm.avatar = user.avatar;
	_userForm.color = user.color;
};

function handleUserDelete(id: string){
	ElMessageBox.alert("你确定要删除这个用户吗", "警告", {
		confirmButtonText: "确定删除",
		cancelButtonText: "取消",
		type: "warning",
	}).then(async () => {
		await deleteUser(id);
		loadUserList();
	});
};

function handleDialogClose(){
	_dialogVisible.value = false;
	_currentUserId.value = "";
	_userForm.username = "";
	_userForm.password = "";
	_userForm.avatar = "";
	_userForm.color = "";
};

const handelSubmit = async () => {
	if (_currentUserId.value) {
		const { username, password, avatar, color } = toRaw(_userForm);
		await updateUser(_currentUserId.value, username, password, avatar, color);
	} else {
		const { username, password, avatar, color } = toRaw(_userForm);
		await createUser(username, password, avatar, color);
	}
	loadUserList();
	handleDialogClose();
};

onMounted(async () => {
	await loadUserList();
});

const loadUserList = async () => {
	isLoading.value = true;
	const { total, userList, current } = await getUserList(currentPage.value, size.value);
	_userList.value = userList;
	totalPage.value = total;
	currentPage.value = current;

	isLoading.value = false;
};
</script>

<template>
	<div class="user-page">
		<el-row class="top-bar">
			<el-col :span="20" class="title"><h4>用户管理</h4></el-col>
			<el-col :span="4" class="button-container">
				<el-button class="button-create-user" type="primary" @click="_dialogVisible = true">添加用户</el-button>
			</el-col>
		</el-row>

		<el-table fit v-loading="isLoading" border :data="_userList" class="user-list-container">
			<el-table-column align="center" label="头像" width="100">
				<template #default="scope">
					<div class="user-card">
						<div class="avatar" :style="{ 'background-color': scope.row.color }">
							<font-awesome-icon class="icon" :icon="scope.row.avatar" />
						</div>
					</div>
				</template>
			</el-table-column>
			<el-table-column align="center" label="ID" prop="id"></el-table-column>
			<el-table-column align="center" label="用户名" prop="username"></el-table-column>
			<el-table-column align="center" label="头像图标名" prop="avatar"></el-table-column>
			<el-table-column align="center" label="代表颜色" prop="color"></el-table-column>
			<el-table-column align="center" label="操作">
				<template #default="scope">
					<el-button size="small" @click="handleUserEdit(scope.row)">编辑</el-button>
					<el-button size="small" type="danger" @click="handleUserDelete(scope.row.id)">删除</el-button>
				</template>
			</el-table-column>
		</el-table>

		<el-pagination
			background
			v-model:current-page="currentPage"
			:page-size="size"
			layout="total, prev, pager, next"
			:total="totalPage"
			@current-change="handleCurrentChange"
		/>

		<el-dialog
			v-model="_dialogVisible"
			:title="_currentUserId ? '编辑用户' : '添加用户'"
			width="400"
			@close="handleDialogClose"
		>
			<el-form :model="_userForm" label-width="auto">
				<el-form-item label="用户名">
					<el-input v-model="_userForm.username" />
				</el-form-item>
				<el-form-item label="密码">
					<el-input type="password" v-model="_userForm.password" />
				</el-form-item>
				<el-form-item label="头像图标">
					<el-input v-model="_userForm.avatar" />
				</el-form-item>
				<el-form-item label="代表颜色">
					<el-input type="color" v-model="_userForm.color" />
				</el-form-item>
			</el-form>
			<template #footer>
				<span class="dialog-footer">
					<el-button @click="handleDialogClose">取消</el-button>
					<el-button type="primary" @click="handelSubmit">确认</el-button>
				</span>
			</template>
		</el-dialog>
	</div>
</template>

<style lang="scss" scoped>
.user-page {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}
.top-bar {
	width: 100%;
	height: 50px;
	border-radius: 10px;
	padding: 5px 20px;
	display: flex;
	align-items: center;
	box-shadow: var(--el-box-shadow-light);
	& > .button-container > * {
		float: right;
	}
}
.user-list-container {
	flex: 1;
	margin: 10px 0;
}

.user-card {
	height: 3rem;
	display: flex;
	justify-content: space-around;
	align-items: center;

	& > .avatar {
		$icon-size: 3rem;
		min-width: $icon-size;
		min-height: $icon-size;
		text-align: center;
		line-height: $icon-size;
		border-radius: 50%;
		font-size: 1.5rem;
		color: #ffffff;
		box-shadow: var(--box-shadow);
	}
}
</style>
