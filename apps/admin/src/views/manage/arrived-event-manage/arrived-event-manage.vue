<script setup lang="ts">
import {useRouter} from "vue-router";
import {onMounted, ref} from "vue";
import {ArrivedEvent} from "@/interfaces/interfaces";
import {getArrivedEventList} from "@/utils/api/arrivedEvent";
import ArrivedEventListCard from "@/views/manage/arrived-event-manage/components/arrived-event-list-card.vue";

const _arrivedEventsList = ref<ArrivedEvent[]>([]);

const router = useRouter();

const currentPage = ref(1);
const totalPage = ref(0);
const size = ref(10);

const isLoading = ref(true);

function handleArrivedEventCreate(){
  router.push({path: "/arrived-event-editor"});
};

function handleArrivedEventEdit(id: string){
  router.push({path: "/arrived-event-editor", query: {id}});
};

const handleArrivedEventDelete = async () => {
  await loadArrivedEventList();
};

const handleCurrentChange = async () => {
  await loadArrivedEventList();
};

const loadArrivedEventList = async () => {
  isLoading.value = true;
  const {total, arrivedEventsList, current} = await getArrivedEventList(currentPage.value, size.value);

  _arrivedEventsList.value = arrivedEventsList;
  totalPage.value = total;
  currentPage.value = current;
  isLoading.value = false;
};

onMounted(async () => {
  await loadArrivedEventList();
});
</script>

<template>
  <div class="arrived-event-page">
    <el-row class="top-bar">
      <el-col :span="20" class="title"><h4>到达事件管理</h4></el-col>
      <el-col :span="4" class="button-container">
        <el-button type="primary" @click="handleArrivedEventCreate">创建到达事件</el-button>
      </el-col>
    </el-row>

    <div v-loading="isLoading" element-loading-text="Loading..." class="arrived-event-list-container">
      <arrived-event-list-card
          @delete.async="handleArrivedEventDelete"
          @edit="handleArrivedEventEdit"
          v-for="arrivedEvent in _arrivedEventsList"
          :key="arrivedEvent.id"
          :arrived-event="arrivedEvent"
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
.arrived-event-page {
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

.arrived-event-list-container {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, 20%);
  grid-template-rows: repeat(2, 50%);
}
</style>
