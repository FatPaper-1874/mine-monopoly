<script setup lang="ts">
import {linkMapItem} from "@/utils/api/mapItem";
import {MapItem} from "@/interfaces/interfaces";
import {computed, ref} from "vue";
import {ElMessage} from "element-plus";

const props = withDefaults(defineProps<{ currentMapItem: MapItem | undefined; beLinked: boolean }>(), {
  currentMapItem: undefined,
  beLinked: false,
});
const emits = defineEmits(["linked"]);

const linkTargetId = ref<string>("");

const canLink = computed(() => !props.beLinked && !hasLinkTarget.value);

const hasLinkTarget = computed(() => props.currentMapItem != undefined && props.currentMapItem.linkto != null);

const handleLinkMapItem = async () => {
  if (props.currentMapItem) {
    await linkMapItem(props.currentMapItem.id, linkTargetId.value);
    linkTargetId.value = "";
    emits("linked");
  }
};

function handleCopyCurrentId(){
  if (!props.currentMapItem) return;
  linkTargetId.value = props.currentMapItem.id;
  ElMessage({message: "复制成功", type: "success"});
};

</script>

<template>
  <el-descriptions class="mapitem-info" border direction="horizontal" :column="4" size="small">
    <el-descriptions-item label-align="center" align="center" :span="4" label="id">
      {{ currentMapItem?.id }}
      <el-button style="margin-left: 10px" @click="handleCopyCurrentId" size="small" type="primary" link
      >复制ID到Link输入框
      </el-button
      >
    </el-descriptions-item>
    <el-descriptions-item label-align="center" align="center" :span="4" label="名称"
    >{{ currentMapItem?._id }}
    </el-descriptions-item>
    <el-descriptions-item label-align="center" align="center" :span="2" label="类型"
    >{{ currentMapItem?.type.name }}
    </el-descriptions-item>
    <el-descriptions-item label-align="center" align="center" :span="2" label="坐标">
      [{{ currentMapItem?.x }} - {{ currentMapItem?.y }}]
    </el-descriptions-item>
    <el-descriptions-item v-if="hasLinkTarget" label-align="center" align="center" :span="4" label="link">
      {{ currentMapItem?.linkto?._id }}
    </el-descriptions-item>
    <el-descriptions-item v-else-if="beLinked" label-align="center" align="center" :span="4">
      这个MapItem是地皮
    </el-descriptions-item>
    <el-descriptions-item v-else-if="canLink" label-align="center" align="center" :span="4">
      <el-input clearable style="margin: 10px 0" v-model="linkTargetId" placeholder="输入连接目标id">
        <template #append>
          <el-button @click="handleLinkMapItem" :disabled="!currentMapItem || linkTargetId == ''" type="primary"
          >link
          </el-button
          >
        </template>
      </el-input>
    </el-descriptions-item>
  </el-descriptions>
</template>

<style lang="scss" scoped>
.mapitem-info {
  max-width: 300px;
  padding: 10px;
}
</style>
