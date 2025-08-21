<script setup lang="ts">
import chanceCardListCard from "./components/chance-card-list-card.vue";
import router from "@/router/index";
import {ChanceCard} from "@/interfaces/interfaces";
import {onMounted, ref} from "vue";
import {getChanceCardsList} from "@/utils/api/chanceCard";

const _chanceCardList = ref<ChanceCard[]>([]);

const currentPage = ref(1);
const totalPage = ref(0);
const size = ref(10);

const isLoading = ref(true);

function handleChanceCardCreate(){
  router.push({path: "/chance-card-editor"});
};

function handleChanceCardEdit(id: string){
  router.push({path: "/chance-card-editor", query: {id}});
};

function handleChanceCardDelete(){
  loadChanceCardList();
};

function handleCurrentChange(){
  loadChanceCardList();
};

const loadChanceCardList = async () => {
  isLoading.value = true;
  const {total, chanceCardsList, current} = await getChanceCardsList(currentPage.value, size.value);

  _chanceCardList.value = chanceCardsList;
  totalPage.value = total;
  currentPage.value = current;
  isLoading.value = false;
};

onMounted(async () => {
  await loadChanceCardList();
});
</script>

<template>
  <div class="chance-card-page">
    <el-row class="top-bar">
      <el-col :span="20" class="title"><h4>机会卡管理</h4></el-col>
      <el-col :span="4" class="button-container">
        <el-button type="primary" @click="handleChanceCardCreate">创建机会卡</el-button>
      </el-col>
    </el-row>

    <div v-loading="isLoading" element-loading-text="Loading..." class="chance-card-list-container">
      <chanceCardListCard
          @delete.async="handleChanceCardDelete"
          @edit="handleChanceCardEdit"
          v-for="chanceCard in _chanceCardList"
          :key="chanceCard.id"
          :chance-card="chanceCard"
      />
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
</template>

<style lang="scss" scoped>
.chance-card-page {
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

.chance-card-list-container {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, 20%);
  grid-template-rows: repeat(2, 50%);
}
</style>
