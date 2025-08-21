import { GamePhaseInfo } from "./game-process";
import { MapItem, IProperty, ChanceCard, MapItemType, Street, Role, MapEvent } from "./item";

export interface GameMap {
	id: string;
	name: string;
	background: string;
	mapItems: MapItem[];
	properties: IProperty[];
	chanceCards: ChanceCard[];
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
	houseModel_lv0_id?: string;
	houseModel_lv1_id?: string;
	houseModel_lv2_id?: string;
}
