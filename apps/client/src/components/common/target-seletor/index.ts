import { TargetSelectType } from "@mine-monopoly/types";
import { App, createApp, h, render } from "vue";
import TargetSelector from "./index.vue";
import { FPMessageBox } from "@src/components/utils/fp-message-box";

export async function showTargetSelector(
	type: TargetSelectType,
	option?: { title?: string; confirmText?: string; cancelText?: string },
) {
	return new Promise<string[]>((resolve, reject) => {
		let targetSelectedIdList: string[] = [];
		FPMessageBox({
			title: option ? option.title : "选择目标",
			content: h(TargetSelector, {
				targetType: type,
				onTargetSelected: (newValue) => {
					targetSelectedIdList = newValue;
				},
			}),
			cancelText: option?.cancelText,
			confirmText: option?.confirmText,
		})
			.then(() => {
				console.log("🚀 ~ showTargetSelector ~ targetSelectedIdList:", targetSelectedIdList);
				resolve(targetSelectedIdList);
			})
			.catch((e) => {
				reject([]);
			});
	});
}
