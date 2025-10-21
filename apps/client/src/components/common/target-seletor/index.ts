import { TargetSelectType } from "@fatpaper-monopoly/types";
import { App, createApp, h, render } from "vue";
import TargetSelector from "./index.vue";
import { FPMessageBox } from "@src/components/utils/fp-message-box";

export async function showTargetSelector(type: TargetSelectType) {
	return new Promise<string[]>((resolve, reject) => {
		let targetSelectedIdList: string[] = [];
		FPMessageBox({
			title: "选择目标",
			content: h(TargetSelector, {
				targetType: type,
				onTargetSelected: (newValue) => {
					targetSelectedIdList = newValue;
				},
			}),
		})
			.then(() => {
				resolve(targetSelectedIdList);
			})
			.catch(() => {
				reject();
			});
	});
}
