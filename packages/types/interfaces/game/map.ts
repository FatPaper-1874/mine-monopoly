import { ChanceCardInfo, GamePhaseInfo, GameSetting, UISchema, UITemplate } from "./game-process";
import { MapItem, MapItemType, Street, Role, MapEvent, GameMapInfo, CustomUI } from "./item";
import { FormSchema } from "./util";

/**
 * 游戏设置表单接口
 * 预留用于扩展
 */
export interface GameSettingForm {}

/**
 * 游戏地图接口
 * 表示完整的游戏地图配置
 */
export interface GameMap {
	/** 地图唯一标识 */
	id: string;

	/** 地图基本信息 */
	info: GameMapInfo;

	/** 地图项列表 */
	mapItems: MapItem[];

	/** 机会卡列表 */
	chanceCards: ChanceCardInfo[];

	/** 地图项类型列表 */
	mapItemTypes: MapItemType[];

	/** 地图索引（地图项 ID 顺序列表） */
	mapIndex: string[];

	/** 角色列表 */
	roles: Role[];

	/** 是否正在使用 */
	inUse: boolean;

	/** 地图事件列表 */
	mapEvents: MapEvent[];

	/** 游戏设置表单 Schema */
	gameSettingForm: FormSchema[];

	/** 游戏阶段配置 */
	phases: {
		/** 游戏结束规则阶段 */
		gameOverRule: GamePhaseInfo[];

		/** 游戏初始化阶段 */
		gameInited: GamePhaseInfo[];

		/** 玩家预初始化阶段（在玩家初始化之前运行） */
		playerPreInit: GamePhaseInfo[];

		/** 地皮预初始化阶段（在地皮初始化之前运行） */
		propertyPreInit: GamePhaseInfo[];

		/** 游戏回合开始阶段 */
		gameRoundStart: GamePhaseInfo[];

		/** 玩家回合阶段 */
		playerRound: GamePhaseInfo[];

		/** 游戏回合结束阶段 */
		gameRoundEnd: GamePhaseInfo[];
	};

	/** 建筑模型 ID 列表 */
	buildingModelIdList: string[];

	/** UI 模板列表 */
	uiTemplates: UITemplate[];

	/** 自定义 UI 列表 */
	customUIs: CustomUI[];

	/** 额外库代码（TypeScript 代码字符串） */
	extraLibs: string;
}
