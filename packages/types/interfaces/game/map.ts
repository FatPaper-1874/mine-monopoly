import { ChanceCardInfo, GamePhaseInfo } from "./game-process";
import { MapItem, MapItemType, Street, Role, MapEvent, GameMapInfo, CustomUI } from "./item";

export interface GameMap {
	id: string;
	info: GameMapInfo;
	mapItems: MapItem[];
	chanceCards: ChanceCardInfo[];
	mapItemTypes: MapItemType[];
	mapIndex: string[];
	streets: Street[];
	roles: Role[];
	inUse: boolean;
	mapEvents: MapEvent[];
	phases: {
		gameRoundStart: GamePhaseInfo[];
		playerRound: GamePhaseInfo[];
		gameRoundEnd: GamePhaseInfo[];
	};
	buildingModelIdList: string[];
	customUIs: CustomUI[];
}
