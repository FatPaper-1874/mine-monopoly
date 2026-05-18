import { createApp } from "vue";
import "@/assets/style.scss";
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
	faRightFromBracket,
	faPerson,
	faTowerBroadcast,
	faSpinner,
	faUsers,
	faCircleDot,
	faUserShield,
	faGamepad,
	faCalendarDay,
	faClock,
	faDoorOpen,
	faLockOpen,
	faLock,
	faPlay,
	faChevronRight,
	faBars,
	faXmark,
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
	faGauge,
	faRightFromBracket,
	faPerson,
	faTowerBroadcast,
	faSpinner,
	faUsers,
	faCircleDot,
	faUserShield,
	faGamepad,
	faCalendarDay,
	faClock,
	faDoorOpen,
	faLockOpen,
	faLock,
	faPlay,
	faChevronRight,
	faBars,
	faXmark
);

const app = createApp(App);
app.use(router).component("font-awesome-icon", FontAwesomeIcon).mount("#app");
