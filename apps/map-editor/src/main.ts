import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import "@src/assets/index.scss";

/* import the fontawesome core */
import { library } from "@fortawesome/fontawesome-svg-core";

/* import font awesome icon component */
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

/* import specific icons */
import {
	faRectangleXmark,
	faWindowRestore,
	faWindowMinimize,
	faWindowMaximize,
	faHouseChimneyWindow,
	faHandPointer,
	faPenToSquare,
	faBoxesStacked,
	faBook,
	faWandMagicSparkles,
	faPlus,
	faCamera,
	faPlane,
	faRoad,
	faMicrochip,
	faArrowDown,
	faArrowsSpin,
	faBezierCurve,
} from "@fortawesome/free-solid-svg-icons";
import { eventBus } from "./utils/event-bus";
import { loadMapDataFromPath } from "@src/utils/file";

library.add(
	faRectangleXmark,
	faWindowRestore,
	faWindowMinimize,
	faWindowMaximize,
	faHouseChimneyWindow,
	faHandPointer,
	faPenToSquare,
	faBoxesStacked,
	faBook,
	faWandMagicSparkles,
	faPlus,
	faCamera,
	faPlane,
	faRoad,
	faMicrochip,
	faArrowDown,
	faArrowsSpin,
	faBezierCurve
);

eventBus.on("renderer-ready", () => {
	const lastTimeFilePath = localStorage.getItem("last-time-file-path");
	if (lastTimeFilePath) loadMapDataFromPath(lastTimeFilePath);
	eventBus.off("renderer-ready");
});

const app = createApp(App).component("font-awesome-icon", FontAwesomeIcon);

app.use(createPinia());
app.use(router);

app.mount("#app");

import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// @ts-ignore
self.MonacoEnvironment = {
	getWorker(_: any, label: string) {
		if (label === "typescript" || label === "javascript") {
			return new tsWorker();
		}
		return new editorWorker();
	},
};

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
