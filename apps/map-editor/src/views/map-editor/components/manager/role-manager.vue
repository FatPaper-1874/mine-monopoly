<script setup lang="ts">
import { useMapDataStore, useResourceStore } from "@src/stores";
import { computed, reactive, ref } from "vue";
import RoleForm from "./forms/role-form/index.vue";
import rolePreviewer from "./components/role-previewer.vue";
import { message } from "ant-design-vue";
import { Role } from "@mine-monopoly/types";

const mapDataStroe = useMapDataStore();
const resourcesStore = useResourceStore();

const roleCount = computed(() => mapDataStroe.roles.length);
const roleToShow = computed(() => {
	return mapDataStroe.roles.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});

const model = defineModel({ default: false });
const currentPage = ref(1);
const pageSize = ref(6);

const createRoleFromVisible = ref(false);
const currentRole = ref<Role | undefined>();

function handleCreate() {
	currentRole.value = undefined;
	createRoleFromVisible.value = true;
}

function handleEdit(id: string) {
	const role = mapDataStroe.findRoleById(id);
	if (!role) {
		message.error("查找角色失败");
		return;
	}
	currentRole.value = role;
	createRoleFromVisible.value = true;
}
</script>

<template>
	<a-modal
		destroyOnClose
		wrap-class-name="role-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="角色管理"
	>
		<div class="operation-container">
			<a-button style="float: right" @click="handleCreate" type="primary">添加角色</a-button>
		</div>
		<a-empty v-if="roleCount === 0" description="没有数据" />
		<div class="preview-container">
			<role-previewer @edit="handleEdit" v-for="role in roleToShow" :role="role" />
		</div>
		<a-pagination
			v-model:current="currentPage"
			:show-total="() => `${roleCount} 个角色`"
			:total="roleCount"
			:pageSize="pageSize"
			show-less-items
		/>
	</a-modal>
	<a-modal width="100%" destroyOnClose title="编辑角色" :footer="null" v-model:open="createRoleFromVisible" centered>
		<role-form @submit="createRoleFromVisible = false" v-model="createRoleFromVisible" :role="currentRole" />
	</a-modal>
</template>

<style lang="scss">
.role-manager-container {
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
		flex-direction: column;
	}

	.preview-container {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr); /* 3列，等宽 */
		grid-template-rows: repeat(2, 1fr); /* 2行，等高 */
		gap: 20px; /* 网格间隙 */
		padding: 10px;
	}
}
</style>
