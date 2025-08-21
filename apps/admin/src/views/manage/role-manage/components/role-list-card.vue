<script setup lang="ts">
import {ElMessageBox} from "element-plus";
import {Role} from "@/interfaces/interfaces";
import {computed, onMounted, onUnmounted, ref} from "vue";
import {RoleCardPreviewerRenderer} from "./utils/RoleCardPreviewerRenderer";

const {role} = defineProps<{ role: Role }>();
const emit = defineEmits(["delete", "edit"]);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let roleCardPreviewerRenderer: RoleCardPreviewerRenderer | undefined = undefined;

onMounted(() => {
  const canvasEl = canvasRef.value;
  if (!canvasEl) return;
  roleCardPreviewerRenderer = new RoleCardPreviewerRenderer(canvasEl, role.baseUrl, role.fileName);
})

onUnmounted(() => {
  roleCardPreviewerRenderer && roleCardPreviewerRenderer.destroy();
})

function handleEdit(){
  emit("edit")
};
function handleDelete(){
  ElMessageBox.alert("你确定要删除吗", "警告", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    // await deleteModel(model.id);
    emit("delete");
  });
};

function handleCommand(command: string){
  switch (command) {
    case "edit":
      handleEdit();
      break;
    case "delete":
      handleDelete();
      break;
  }
};
</script>

<template>
  <el-card class="role-preview-card" :body-style="{ width: '100%', flex: '1', 'box-sizing': 'border-box' }">
    <template #header>
      <div class="card-header">
        <span :style="{color: role.color}">{{ role.roleName }}</span>
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button class="button" text style="color: #409eff">操作</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">编辑</el-dropdown-item>
              <el-dropdown-item command="delete" style="color: red">删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>
    <canvas class="role-card-previewer__canvas" ref="canvasRef"></canvas>
  </el-card>
</template>

<style lang="scss" scoped>
.role-preview-card {
  margin: 10px;
  border-radius: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  & span {
    font-weight: bold;
  }
}

.role-card-previewer__canvas {
  display: block;
  border-radius: 10px;
  width: 100%;
  height: 100%;
}
</style>
