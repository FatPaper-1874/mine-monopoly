import type { GameMap } from "@mine-monopoly/types";
import type { GamePhaseInfo } from "@mine-monopoly/types/interfaces/game/map";

/**
 * 向后兼容：确保地图 phases 中所有已知阶段类型都存在。
 * 旧地图可能缺少新增的阶段类型（如 postRestore），缺失的初始化为空数组。
 *
 * 此函数会原地修改 phases 对象。
 *
 * @param phases - 地图 phases 对象
 */
export function normalizePhases(phases: GameMap["phases"]): void {
	const requiredPhases: Array<keyof GameMap["phases"]> = [
		"gameOverRule",
		"gameInited",
		"playerPreInit",
		"propertyPreInit",
		"gameRoundStart",
		"playerRound",
		"gameRoundEnd",
		"postRestore",
	];
	for (const key of requiredPhases) {
		// 使用 ??= 运算符仅在属性为 undefined/null 时赋值，避免不必要的覆盖
		// 注意：由于 phases[key] 类型可能包含 undefined，这里需要类型断言
		// 但由于我们只对已知的 key 进行操作，这是类型安全的
		if (!phases[key]) {
			(phases as Record<keyof GameMap["phases"], GamePhaseInfo[]>)[key] = [];
		}
	}
}

/**
 * 向后兼容：确保地图 phases 中所有已知阶段类型都存在。
 * 旧地图可能缺少新增的阶段类型（如 postRestore），缺失的初始化为空数组。
 *
 * 此函数会原地修改 map 对象并返回它（方便链式调用）。
 *
 * @param map - 地图对象
 * @returns 同一个 map 对象（已规范化）
 */
export function normalizeGameMap(map: GameMap): GameMap {
	const phases = map.phases;
	if (!phases) return map;
	normalizePhases(phases);
	return map;
}
