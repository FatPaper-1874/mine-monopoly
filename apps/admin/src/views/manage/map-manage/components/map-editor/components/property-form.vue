<script setup lang="ts">
import { updateProperty, createProperty } from "@/utils/api/property";
import { FormInstance, FormRules } from "element-plus";
import { reactive, ref, toRaw, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { MapItem, Street } from "@/interfaces/interfaces";

const props = withDefaults(defineProps<{ streetList: Array<Street>; currentMapItem: MapItem | undefined }>(), {
	streetList: () => new Array<Street>(),
	currentMapItem: undefined,
});
const emits = defineEmits(["submit"]);
const mapId = useRoute().query.mapId as string;

const currentMapItemId = computed(() => {
	return props.currentMapItem ? props.currentMapItem.id : "";
});

//地皮表单管理
const propertyId = ref("");

const newPropertyForm = reactive({
	name: "",
	sellCost: 100,
	buildCost: 100,
	cost_lv0: 100,
	cost_lv1: 100,
	cost_lv2: 100,
	streetId: "",
});

onMounted(() => {
	updateForm(props.currentMapItem);
});

watch(
	() => props.currentMapItem,
	async (newMapItem) => {
		updateForm(newMapItem);
	},
	{ deep: true }
);

function updateForm(newMapItem: MapItem | undefined) {
	if (newMapItem) {
		if (newMapItem.property) {
			const { id, name, sellCost, buildCost, cost_lv0, cost_lv1, cost_lv2, street } = newMapItem.property;
			propertyId.value = id;
			newPropertyForm.name = name;
			newPropertyForm.sellCost = sellCost;
			newPropertyForm.buildCost = buildCost;
			newPropertyForm.cost_lv0 = cost_lv0;
			newPropertyForm.cost_lv1 = cost_lv1;
			newPropertyForm.cost_lv2 = cost_lv2;
			newPropertyForm.streetId = street.id;
		} else {
			propertyId.value = "";
			propertyFormRef.value?.resetFields();
		}
	} else {
		propertyFormRef.value?.resetFields();
	}
}

const propertyFormRef = ref<FormInstance>();

const propertyFormRules = reactive<FormRules>({
	name: [{ required: true, message: "填写地皮的名称", trigger: "blur" }],
	sellCost: [{ required: true, message: "填写空地价格", trigger: "blur" }],
	buildCost: [{ required: true, message: "填写建楼价格", trigger: "blur" }],
	cost_lv0: [{ required: true, message: "填写空地过路费", trigger: "blur" }],
	cost_lv1: [{ required: true, message: "填写有一栋楼的过路费", trigger: "blur" }],
	cost_lv2: [{ required: true, message: "填写有两栋楼的过路费", trigger: "blur" }],
	streetId: [{ required: true, message: "选择街道", trigger: "blur" }],
});

const handleCreateOrUpdateProperty = async (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	await formEl.validate(async (valid) => {
		if (valid) {
			const { name, sellCost, buildCost, cost_lv0, cost_lv1, cost_lv2, streetId } = {
				...toRaw(newPropertyForm),
			};

			if (propertyId.value) {
				await updateProperty(propertyId.value, name, sellCost, buildCost, cost_lv0, cost_lv1, cost_lv2, streetId);
			} else {
				await createProperty(
					name,
					sellCost,
					buildCost,
					cost_lv0,
					cost_lv1,
					cost_lv2,
					currentMapItemId.value,
					streetId,
					mapId
				);
			}
			emits("submit");
		} else {
			console.log("error submit!");
			return false;
		}
	});
};

const autoArrivedCost = () => {
	const { sellCost, buildCost } = {
		...toRaw(newPropertyForm),
	};
	newPropertyForm.cost_lv0 = 0.7 * sellCost;
	newPropertyForm.cost_lv1 = 0.8 * sellCost + buildCost * 0.6;
	newPropertyForm.cost_lv2 = 0.8 * sellCost + buildCost * 1.1;
};
</script>

<template>
	<el-form
		class="property-form"
		label-position="left"
		label-width="120px"
		ref="propertyFormRef"
		size="small"
		:rules="propertyFormRules"
		:model="newPropertyForm"
		:disabled="currentMapItemId === '' || currentMapItem?.linkto"
	>
		<el-form-item label="地皮名称" prop="name">
			<el-input v-model="newPropertyForm.name" placeholder=""></el-input>
		</el-form-item>

		<el-form-item label="空地价格" prop="sellCost">
			<el-input-number step-strictly :min="0" :step="100" v-model="newPropertyForm.sellCost" placeholder=""></el-input-number>
		</el-form-item>

		<el-form-item label="建楼价格" prop="buildCost">
			<el-input-number step-strictly :min="0" :step="100" v-model="newPropertyForm.buildCost" placeholder=""></el-input-number>
		</el-form-item>

		<el-form-item label="空地过路费" prop="cost_lv0">
			<el-input-number step-strictly :min="0" :step="100" v-model="newPropertyForm.cost_lv0" placeholder=""></el-input-number>
		</el-form-item>

		<el-form-item label="一栋楼过路费" prop="cost_lv1">
			<el-input-number step-strictly :min="0" :step="100" v-model="newPropertyForm.cost_lv1" placeholder=""></el-input-number>
		</el-form-item>

		<el-form-item label="两栋楼过路费" prop="cost_lv2">
			<el-input-number step-strictly :min="0" :step="100" v-model="newPropertyForm.cost_lv2" placeholder=""></el-input-number>
		</el-form-item>

		<el-form-item label="&nbsp">
			<el-button @click="autoArrivedCost" type="primary">过路费参考</el-button>
		</el-form-item>

		<el-form-item label="所属街道" prop="streetId">
			<el-select clearable v-model="newPropertyForm.streetId" placeholder="选择所属街道">
				<el-option v-for="street in streetList" :key="street.id" :value="street.id" :label="street.name"> </el-option>
			</el-select>
		</el-form-item>

		<el-form-item label="&nbsp">
			<el-button @click="handleCreateOrUpdateProperty(propertyFormRef)" type="primary">绑定地皮</el-button>
		</el-form-item>
	</el-form>
</template>

<style lang="scss" scoped>
.property-form {
	padding: 15px;
	background-color: #fff;
}
</style>
