<script setup lang="ts">
import {deleteMusic, getMusicList} from "@/utils/api/music";
import {Music} from "@/interfaces/interfaces";
import {onMounted, ref} from "vue";
import MusicUpload from "@/views/manage/music-manage/components/music-upload.vue";

//dialog控制
const createMusicVisible = ref(false);

const isLoading = ref(true);

const _musicList = ref<Music[]>();

const currentPage = ref(1);
const totalPage = ref(0);
const size = ref(10);

function handleCurrentChange(){
  loadMusicList();
};

const loadMusicList = async () => {
  isLoading.value = true;
  const {total, musicList, current} = await getMusicList(currentPage.value, size.value);
  _musicList.value = musicList;
  totalPage.value = total;
  currentPage.value = current;

  isLoading.value = false;
};

function handleCreateMusic() {
  createMusicVisible.value = true
}

function handleUploadSuccess() {
  createMusicVisible.value = false;
  loadMusicList();
};

async function handleMusicDelete(id: string) {
  await deleteMusic(id)
  await loadMusicList();
};

onMounted(async () => {
  await loadMusicList();
});
</script>

<template>
  <div class="music-page">
    <el-row class="top-bar">
      <el-col :span="20" class="title"><h4>音乐管理</h4></el-col>
      <el-col :span="4" class="button-container">
        <el-button class="button-create-music" type="primary" @click="handleCreateMusic">添加音乐</el-button>
      </el-col>
    </el-row>

    <div v-loading="isLoading" element-loading-text="Loading..." class="music-list-container">
      <el-table :data="_musicList" style="width: 100%">
        <el-table-column prop="id" label="ID" width="150"/>
        <el-table-column prop="name" label="音乐名" width="120"/>
        <el-table-column prop="url" label="链接"/>
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="scope">
            <el-button link type="danger" size="small" @click="handleMusicDelete(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
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
  <music-upload
      v-model="createMusicVisible"
      @close="createMusicVisible = false"
      @success="handleUploadSuccess"
  ></music-upload>
</template>

<style lang="scss" scoped>
.music-page {
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

.music-list-container {
  flex: 1;
  padding: 20px;
  margin: 10px 0;
  border-radius: 10px;
  box-sizing: border-box;
  box-shadow: var(--el-box-shadow-light);
}
</style>
