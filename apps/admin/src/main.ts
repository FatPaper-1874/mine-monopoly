import { createApp } from "vue";
import "@/assets/style.scss";
import "element-plus/dist/index.css";
import App from "./App.vue";
import router from "./router/index";
import "@/utils/axios";

/* import the fontawesome core */
import { library } from "@fortawesome/fontawesome-svg-core";

/* import font awesome icon component */
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

/* import specific icons */
import {
	faBolt,
	faBomb,
	faHeart,
	faHouse,
	faPalette,
	faSackDollar,
	faWandMagicSparkles,
	faCrown,
	faMapLocationDot,
	faBox,
	faCreditCard,
	faHeadset,
	faCircleCheck,
	faWarning,
	faPlus,
	faUpDownLeftRight,
	faHandPointer,
	faGauge,
} from "@fortawesome/free-solid-svg-icons";

/* add icons to the library */
library.add(
	faBolt,
	faBomb,
	faHeart,
	faHouse,
	faPalette,
	faSackDollar,
	faWandMagicSparkles,
	faCrown,
	faMapLocationDot,
	faBox,
	faCreditCard,
	faHeadset,
	faCircleCheck,
	faWarning,
	faPlus,
	faUpDownLeftRight,
	faHandPointer,
	faGauge
);

const app = createApp(App);
app.use(router).component("font-awesome-icon", FontAwesomeIcon).mount("#app");

// 修复monaco-editor报错
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

import("./components/code-editor/base-interface.d.ts?raw").then((res) => {
	const baseInterface = res.default;
	monaco.languages.typescript.typescriptDefaults.setExtraLibs([{ content: baseInterface }]);
});

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
