<script setup lang="ts">
import { MapData } from "@/interfaces/interfaces";
import { createStreet } from "@/utils/api/street";
import { FormInstance, FormRules } from "element-plus";
import { inject, reactive, ref, toRaw } from "vue";
import { useRoute } from "vue-router";

const mapId = useRoute().query.mapId as string;
const emits = defineEmits(["updateStreets"]);

const newStreetForm = reactive({
	name: "",
	increase: 1,
});

const streetFormRef = ref<FormInstance>();

const streetFormRules = reactive<FormRules>({
	name: [{ required: true, message: "填写街道的名称", trigger: "blur" }],
	increase: [{ required: true, message: "填写过路费增值", trigger: "blur" }],
});

const handleCreateStreet = async (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	await formEl.validate(async (valid) => {
		if (valid) {
			const { name, increase } = { ...toRaw(newStreetForm) };
			await createStreet(name, increase, mapId);
			emits("updateStreets");
			formEl.resetFields();
		} else {
			console.log("error submit!");
			return false;
		}
	});
};
</script>

<template>
	<div class="street-add">
		<el-form
			label-position="top"
			label-width="100px"
			ref="streetFormRef"
			:rules="streetFormRules"
			:model="newStreetForm"
			size="small"
		>
			<el-form-item label="街道名称" prop="name">
				<el-input v-model="newStreetForm.name" placeholder=""></el-input>
			</el-form-item>

			<el-form-item label="过路费增值" prop="name">
				<el-input-number :min="1" :step="0.1" v-model="newStreetForm.increase" placeholder=""></el-input-number>
				<el-button style="margin-left: 10px" @click="handleCreateStreet(streetFormRef)" type="primary"
					>添加街道</el-button
				>
			</el-form-item>
		</el-form>
	</div>
</template>

<style lang="scss" scoped>
.street-add {
	padding: 10px;
	background-color: #ffffff;
}

.el-form-item:last-child {
	margin-bottom: 0;
}
</style>
