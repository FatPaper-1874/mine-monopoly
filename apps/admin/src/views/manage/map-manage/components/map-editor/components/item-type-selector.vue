<script setup lang="ts">
import {getItemTypesListByMapId} from "@/utils/api/map";
import {ItemType} from "@/interfaces/interfaces";
import {ref, onBeforeMount, onMounted, watch, nextTick, computed} from "vue";
import {useRoute} from "vue-router";
import {ModelPreviewerRenderer} from "@/utils/three/ModelPreviewerRenderer";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {ElButton, ElSelect, ElOption, ElOptionGroup, ElMessageBox} from "element-plus";
import ItemTypeCreator from "./item-type-creator.vue";
import {deleteItemType} from "@/utils/api/itemType";

const props = withDefaults(defineProps<{ visible: boolean; currentType: ItemType | undefined }>(), {visible: false});
const emits = defineEmits(["update:currentType", "created"]);

const mapId = useRoute().query.mapId as string;
const currentType = ref<ItemType | undefined>(props.currentType);
const _itemTypeList = ref<Array<ItemType>>([]);

let modelPreviewer: ModelPreviewerRenderer | undefined;

function handleTypeSelect(newType: ItemType) {
  if (modelPreviewer) {
    if (newType) {
      modelPreviewer.loadModel(newType.model.fileUrl, true);
    } else {
      modelPreviewer.clear();
    }
    emits("update:currentType", newType);
  }
}

async function handelDeleteItemType(id: string) {
  ElMessageBox.alert("删除这个Item-Type会导致使用这个Item-Type的MapItem一并删除,你确定要删除吗?", "警告", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    await deleteItemType(id);
    currentType.value = undefined;
    await handleItemTypeCreate();
    modelPreviewer?.clear();
  });
}

async function handleItemTypeCreate() {
  loadItemTypeList();
  emits("created")
}

async function loadItemTypeList() {
  _itemTypeList.value = (await getItemTypesListByMapId(mapId)) as any;
}

onBeforeMount(() => {
  handleItemTypeCreate();
});

watch(
    () => props.visible,
    (newVisible: boolean) => {
      nextTick(() => {
        if (newVisible) {
          const canvasEl = document.getElementById("model-previewer__canvas") as HTMLCanvasElement;
          modelPreviewer = new ModelPreviewerRenderer(canvasEl);
          if (currentType.value) {
            modelPreviewer.loadModel(currentType.value.model.fileUrl, true);
          }
        } else {
          modelPreviewer && modelPreviewer.destroy();
          modelPreviewer = undefined;
        }
      });
    }
);

const createFormVisible = ref(false);
</script>

<template>
  <Transition name="item-type-selector-fade">
    <div class="item-type-selector" v-if="visible">
      <div class="form">
        <el-select size="small" value-key="color" @change="handleTypeSelect" clearable v-model="currentType"
                   placeholder="选择类型进入添加模式">
          <el-option v-for="(item, index) in _itemTypeList" :key="item.color" :value="item" :label="item.name">
            <div class="options-container">
              <span :style="{ color: item.color }">{{ item.name }}</span>
              <el-button v-if="!item.hasEvent" @click="handelDeleteItemType(item.id)" type="danger" text size="small"
                         class="remove-type__button">删除
              </el-button>
            </div>
          </el-option>
        </el-select>
        <el-button size="small" @click="createFormVisible = true" class="add-type__button" type="primary">
          <FontAwesomeIcon icon="plus"/>
          添加类型
        </el-button>
      </div>
      <canvas id="model-previewer__canvas"></canvas>
      <item-type-creator @created="handleItemTypeCreate" v-model:visible="createFormVisible"></item-type-creator>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.item-type-selector {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;
  background-color: #fff;

  & > .form {
    display: flex;
    justify-content: space-around;

    & > .add-type__button {
      margin-left: 10px;
    }
  }

  #model-previewer__canvas {
    margin-top: 10px;
    border-radius: 10px;
    flex: 1;
    width: 100%;
  }
}

.options-container {
  display: flex;
  justify-content: space-between;
  align-items: center;

  & > .remove-type__button {
    pointer-events: stroke;
  }
}

.item-type-selector-fade-enter-active {
  transition: opacity 0.5s ease;
}

.item-type-selector-fade-leave-active {
  transition: none;
}

.item-type-selector-fade-enter-from,
.item-type-selector-fade-leave-to {
  opacity: 0;
}
</style>
