import { App, createApp, VNode, watch } from "vue";
import FPMessageBoxVue from "./fp-message-box.vue";
import useEventBus from "@src/utils/event-bus";
import { GameEventType } from "@fatpaper-monopoly/types";

interface Options extends Record<string, any> {
	title?: string;
	content?: string | VNode | (() => VNode);
	confirmText?: string;
	cancelText?: string;
}

export function FPMessageBox(options: Options) {
	return new Promise((resolve, reject) => {
		showMessageBox(options, resolve, reject);
	});
}

function showMessageBox(options: Options, resolve: (value: unknown) => void, reject: (reason?: any) => void) {
	const fragment = document.createDocumentFragment();
	const messageBoxApp = createApp(FPMessageBoxVue, {
		...options,
		onConfirm: () => {
			unmount(true);
		},
		onClose: () => {
			unmount(false);
		},
	}) as App<any>;

	messageBoxApp.mount(fragment);
	document.body.appendChild(fragment);

	function unmount(isConfirm: boolean) {
		messageBoxApp.unmount();
		useEventBus().remove(GameEventType.TimeOut, unmount);
		isConfirm ? resolve("") : reject();
	}

	useEventBus().once(GameEventType.TimeOut, unmount);
}
