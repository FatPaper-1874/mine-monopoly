import { GameMap } from "@fatpaper-monopoly/types";
import { MapItem, MapItemType } from "@fatpaper-monopoly/types/interfaces/game/item";
import { CameraMode, OperationMode } from "@src/enums";
import mitt from "mitt";

type Events = {
	// 事件名: 事件参数类型
	"change-model": string;

	"renderer-ready": void;
	"map-loaded": GameMap;
	"change-operation-mode": OperationMode;
	"change-camera-mode": CameraMode;
	"change-link-mode": boolean;
	"other-map-item-selected": string;
	"map-item-link": string;
	"map-item-unlink": string;
	"map-item-type-selected": string | undefined;
	"map-item-deleted": string;
	"map-event-link": string;
	"map-event-unlink": string;
	"map-index-update": string[];
	"map-background-update": void;
};

export const eventBus = mitt<Events>();
