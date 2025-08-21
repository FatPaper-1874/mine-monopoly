import Login from "./src/view/login/login.vue";

/* import the fontawesome core */
import { library } from "@fortawesome/fontawesome-svg-core";

import {
	faShieldHalved,
	faSplotch,
	faFan,
	faBook,
	faMusic,
	faGuitar,
	faMugSaucer,
	faCircleCheck,
	faCircleExclamation,
	faCircleXmark,
	faCircleInfo,
	faSpinner,
} from "@fortawesome/free-solid-svg-icons";

library.add(
	faShieldHalved,
	faSplotch,
	faFan,
	faBook,
	faMusic,
	faGuitar,
	faMugSaucer,
	faCircleCheck,
	faCircleExclamation,
	faCircleXmark,
	faCircleInfo,
	faSpinner
);

export { Login };
