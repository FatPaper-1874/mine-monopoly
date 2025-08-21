<script setup lang="ts">
import roleListCard from "./components/role-list-card.vue";
import {deleteModel, getRoleList} from "@/utils/api/role";
import {ChanceCard, Role} from "@/interfaces/interfaces";
import {onMounted, ref} from "vue";
import roleUpload from "./components/role-upload.vue";

//dialog控制
const createRoleVisible = ref(false);

const currentRole = ref<Role | undefined>();
const currentPage = ref(1);
const totalPage = ref(0);
const size = ref(8);

const _roleList = ref<Role[]>([]);

const isLoading = ref(true);

function handleUploadSuccess(){
  createRoleVisible.value = false;
  loadRoleList();
};

const handleCurrentChange = async () => {
};

function handleCreateRole(){
  currentRole.value = undefined;
  createRoleVisible.value = true;
}

function handleEdit(role: Role){
  currentRole.value = role;
  createRoleVisible.value = true;
}

const handleDelete = async (id: string) => {
  await deleteModel(id)
}

const loadRoleList = async () => {
  isLoading.value = true;
  const {total, roleList, current} = await getRoleList(currentPage.value, size.value);
  _roleList.value = roleList;
  totalPage.value = total;
  currentPage.value = current;

  isLoading.value = false;
};

onMounted(async () => {
  await loadRoleList();
});
</script>

<template>
  <div class="role-page">
    <el-row class="top-bar">
      <el-col :span="20" class="title"><h4>游戏角色管理</h4></el-col>
      <el-col :span="4" class="button-container">
        <el-button class="button-create-map" type="primary" @click="handleCreateRole">添加新角色</el-button>
      </el-col>
    </el-row>

    <div v-loading="isLoading" element-loading-text="Loading..." class="role-list-container">
      <roleListCard @delete="handleDelete(role.id)" @edit="handleEdit(role)" v-for="role in _roleList" :key="role.id + role.fileName"
                    :role="role"></roleListCard>
    </div>
    <el-pagination
        background
        v-model:current-page="currentPage"
        :page-size="size"
        layout="total, prev, pager, next"
        :total="totalPage"
        @current-change="handleCurrentChange"
    />
  </div>

  <role-upload
      :role="currentRole"
      :visible="createRoleVisible"
      @close="createRoleVisible = false"
      @success="handleUploadSuccess()"
  ></role-upload>
</template>

<style lang="scss" scoped>
.role-page {
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
  margin-bottom: 10px;

  & > .button-container > * {
    float: right;
  }
}

.role-list-container {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 25%);
  grid-template-rows: repeat(2, 50%);
}
</style>
