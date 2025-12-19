import { ChanceCardInfo, GamePhaseInfo, GameSetting } from "./game-process";
import { MapItem, MapItemType, Street, Role, MapEvent, GameMapInfo, CustomUI } from "./item";
import { FormSchema } from "./util";

export interface GameSettingForm{
}

export interface GameMap {
	id: string;
	info: GameMapInfo;
	mapItems: MapItem[];
	chanceCards: ChanceCardInfo[];
	mapItemTypes: MapItemType[];
	mapIndex: string[];
	roles: Role[];
	inUse: boolean;
	mapEvents: MapEvent[];
	gameSettingForm: FormSchema[];
	phases: {
		gameOverRule: GamePhaseInfo[];
		gameInited: GamePhaseInfo[];
		gameRoundStart: GamePhaseInfo[];
		playerRound: GamePhaseInfo[];
		gameRoundEnd: GamePhaseInfo[];
	};
	buildingModelIdList: string[];
	customUIs: CustomUI[];
}
