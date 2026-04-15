/**
 * Map Content Service
 *
 * Core service for unified map content operations.
 * This service provides a single API for both UI forms and MCP tools.
 */

import { useMapDataStore, useResourceStore } from "@src/stores";
import { generateShortId } from "@src/utils/short-id";
import { eventBus } from "@src/utils/event-bus";
import { z } from "zod";
import { AddChanceCardSchema, UpdateChanceCardSchema, RemoveChanceCardSchema } from "./validators/chance-card-validators";
import { AddRoleSchema, UpdateRoleSchema, RemoveRoleSchema } from "./validators/role-validators";
import { AddMapEventSchema, UpdateMapEventSchema, RemoveMapEventSchema } from "./validators/map-event-validators";
import { AddPhaseSchema, RemovePhaseSchema, UpdatePhaseSchema, type PhaseType } from "./validators/game-phase-validators";
import { GamePhaseMark } from "@mine-monopoly/types";
import { UpdateExtraLibsSchema } from "./validators/extra-libs-validators";
import { AddPropertySchema, UpdatePropertySchema, RemovePropertySchema, type PropertyData, type UpdatePropertyInput } from "./validators/property-validators";
import type { ChanceCard } from "./validators/chance-card-validators";
import type { Role } from "./validators/role-validators";
import type { MapEvent } from "./validators/map-event-validators";

/**
 * Map Content Service class
 */
export class MapContentService {
	/**
	 * Chance Card Operations
	 */

	/**
	 * Add a new chance card
	 * @param data - Chance card data without id
	 * @returns The created chance card with generated id
	 */
	async addChanceCard(data: Omit<ChanceCard, "id">): Promise<ChanceCard> {
		// 1. Validate input data
		const validated = AddChanceCardSchema.parse(data);

		// 2. Get Store instances
		const mapDataStore = useMapDataStore();
		const resourceStore = useResourceStore();

		// 3. Auto-generate iconId if not provided
		let iconId = validated.iconId;
		if (!iconId) {
			const tempImage = await resourceStore.addTempImage();
			if (!tempImage?.id) {
				throw new Error("Failed to generate temporary image resource");
			}
			iconId = tempImage.id;
		}

		// 4. Construct data object with generated ID
		const newCard: ChanceCard = {
			id: generateShortId('card'),
			name: validated.name,
			type: validated.type,
			description: validated.description,
			color: validated.color,
			iconId: iconId,
			effectCode: validated.effectCode,
		};

		// 5. Call Store
		mapDataStore.addChanceCard(newCard as any);

		// 6. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "add_chance_card",
			success: true,
			message: `添加机会卡成功: ${newCard.name}`,
			details: { id: newCard.id, name: newCard.name }
		});

		return newCard;
	}

	/**
	 * Update an existing chance card
	 * @param data - Chance card data with id
	 * @returns The updated chance card
	 */
	async updateChanceCard(data: ChanceCard): Promise<ChanceCard> {
		// 1. Validate input
		const validated = UpdateChanceCardSchema.parse(data);

		// 2. Check if exists
		const mapDataStore = useMapDataStore();
		const existing = mapDataStore.chanceCards.find(c => c.id === validated.id);
		if (!existing) {
			throw new Error(`机会卡不存在: ${validated.id}`);
		}

		// 3. Use provided iconId only if it exists in resource store, otherwise keep existing
		const resourceStore = useResourceStore();
		let iconId = existing.iconId;
		if (validated.iconId && resourceStore.findImageById(validated.iconId)) {
			iconId = validated.iconId;
		}

		// 4. Construct updated data
		const updatedCard: ChanceCard = {
			id: validated.id,
			name: validated.name,
			type: validated.type,
			description: validated.description,
			color: validated.color,
			iconId: iconId,
			effectCode: validated.effectCode,
		};

		// 5. Call Store
		mapDataStore.updateChanceCard(updatedCard as any);

		// 6. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "update_chance_card",
			success: true,
			message: `更新机会卡成功: ${updatedCard.name}`,
			details: { id: updatedCard.id, name: updatedCard.name }
		});

		return updatedCard;
	}

	/**
	 * Remove a chance card
	 * @param cardId - The ID of the chance card to remove
	 */
	async removeChanceCard(cardId: string): Promise<void> {
		// 1. Validate input
		const validated = RemoveChanceCardSchema.parse({ cardId });

		// 2. Check if exists
		const mapDataStore = useMapDataStore();
		const existing = mapDataStore.chanceCards.find(c => c.id === validated.cardId);
		if (!existing) {
			throw new Error(`机会卡不存在: ${validated.cardId}`);
		}

		// 3. Call Store
		mapDataStore.reomveChanceCard(validated.cardId);

		// 4. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "remove_chance_card",
			success: true,
			message: `删除机会卡成功`,
			details: { id: validated.cardId }
		});
	}

	/**
	 * Role Operations
	 */

	/**
	 * Add a new role
	 * @param data - Role data without id
	 * @returns The created role with generated id
	 */
	async addRole(data: Omit<Role, "id">): Promise<Role> {
		// 1. Validate input data
		const validated = AddRoleSchema.parse(data);

		// 2. Get Store instances
		const mapDataStore = useMapDataStore();
		const resourceStore = useResourceStore();

		// 3. Auto-generate imageId if not provided
		let imageId = validated.imageId;
		if (!imageId) {
			const tempImage = await resourceStore.addTempImage();
			if (!tempImage?.id) {
				throw new Error("Failed to generate temporary image resource");
			}
			imageId = tempImage.id;
		}

		// 4. Construct data object with generated ID
		const newRole: Role = {
			id: generateShortId('role'),
			name: validated.name,
			description: validated.description || "",
			color: validated.color || "#000000",
			initCode: validated.initCode || "",
			imageId: imageId,
		};

		// 5. Call Store
		mapDataStore.addRole(newRole as any);

		// 6. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "add_role",
			success: true,
			message: `添加角色成功: ${newRole.name}`,
			details: { id: newRole.id, name: newRole.name }
		});

		return newRole;
	}

	/**
	 * Update an existing role
	 * @param data - Role data with roleId
	 * @returns The updated role
	 */
	async updateRole(data: z.infer<typeof UpdateRoleSchema>): Promise<Role> {
		// 1. Validate input
		const validated = UpdateRoleSchema.parse(data);

		// 2. Check if exists and get current data
		const mapDataStore = useMapDataStore();
		const role = mapDataStore.findRoleById(validated.roleId);
		if (!role) {
			throw new Error(`角色不存在: ${validated.roleId}`);
		}

		// 3. Merge updated fields
		const updated = { ...role };
		if (validated.name !== undefined) updated.name = validated.name;
		if (validated.description !== undefined) updated.description = validated.description;
		if (validated.color !== undefined) updated.color = validated.color;
		if (validated.initCode !== undefined) updated.initCode = validated.initCode;
		if (validated.imageId !== undefined) {
			const resourceStore = useResourceStore();
			if (resourceStore.findImageById(validated.imageId)) {
				updated.imageId = validated.imageId;
			}
		}

		// 4. Call Store
		mapDataStore.editRole(updated as any);

		// 5. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "update_role",
			success: true,
			message: `更新角色成功: ${updated.name}`,
			details: { id: validated.roleId, name: updated.name }
		});

		return updated as Role;
	}

	/**
	 * Remove a role
	 * @param roleId - The ID of the role to remove
	 */
	async removeRole(roleId: string): Promise<void> {
		// 1. Validate input
		const validated = RemoveRoleSchema.parse({ roleId });

		// 2. Check if exists
		const mapDataStore = useMapDataStore();
		const existing = mapDataStore.roles.find(r => r.id === validated.roleId);
		if (!existing) {
			throw new Error(`角色不存在: ${validated.roleId}`);
		}

		// 3. Call Store
		mapDataStore.removeRole(validated.roleId);

		// 4. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "remove_role",
			success: true,
			message: `删除角色成功`,
			details: { id: validated.roleId }
		});
	}

	/**
	 * Map Event Operations
	 */

	/**
	 * Add a new map event
	 * @param data - Map event data without id
	 * @returns The created map event with generated id
	 */
	async addMapEvent(data: Omit<MapEvent, "id">): Promise<MapEvent> {
		// 1. Validate input data
		const validated = AddMapEventSchema.parse(data);

		// 2. Get Store instances
		const mapDataStore = useMapDataStore();
		const resourceStore = useResourceStore();

		// 3. Auto-generate iconId if not provided
		let iconId = validated.iconId;
		if (!iconId) {
			const tempImage = await resourceStore.addTempImage();
			if (!tempImage?.id) {
				throw new Error("Failed to generate temporary image resource");
			}
			iconId = tempImage.id;
		}

		// 4. Construct data object with generated ID
		const newEvent: MapEvent = {
			id: generateShortId('event'),
			name: validated.name,
			type: validated.type,
			description: validated.description || "",
			iconId: iconId,
			effectCode: validated.effectCode,
		};

		// 5. Call Store
		mapDataStore.addMapEvent(newEvent as any);

		// 6. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "add_map_event",
			success: true,
			message: `添加地图事件成功: ${newEvent.name}`,
			details: { id: newEvent.id, name: newEvent.name }
		});

		return newEvent;
	}

	/**
	 * Update an existing map event
	 * @param data - Map event data with id
	 * @returns The updated map event
	 */
	async updateMapEvent(data: MapEvent): Promise<MapEvent> {
		// 1. Validate input
		const validated = UpdateMapEventSchema.parse(data);

		// 2. Check if exists
		const mapDataStore = useMapDataStore();
		const existing = mapDataStore.findMapEventById(validated.id);
		if (!existing) {
			throw new Error(`地图事件不存在: ${validated.id}`);
		}

		// 3. Use provided iconId only if it exists in resource store, otherwise keep existing
		const resourceStore = useResourceStore();
		let iconId = existing.iconId;
		if (validated.iconId && resourceStore.findImageById(validated.iconId)) {
			iconId = validated.iconId;
		}

		// 4. Construct updated data
		const updatedEvent: MapEvent = {
			id: validated.id,
			name: validated.name,
			type: validated.type,
			description: validated.description || "",
			iconId: iconId,
			effectCode: validated.effectCode,
		};

		// 5. Call Store
		mapDataStore.updateMapEvent(updatedEvent as any);

		// 6. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "update_map_event",
			success: true,
			message: `更新地图事件成功: ${updatedEvent.name}`,
			details: { id: updatedEvent.id, name: updatedEvent.name }
		});

		return updatedEvent;
	}

	/**
	 * Remove a map event
	 * @param eventId - The ID of the map event to remove
	 */
	async removeMapEvent(eventId: string): Promise<void> {
		// 1. Validate input
		const validated = RemoveMapEventSchema.parse({ eventId });

		// 2. Check if exists
		const mapDataStore = useMapDataStore();
		const existing = mapDataStore.mapEvents.find(e => e.id === validated.eventId);
		if (!existing) {
			throw new Error(`地图事件不存在: ${validated.eventId}`);
		}

		// 3. Call Store
		mapDataStore.reomveMapEvent(validated.eventId);

		// 4. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "remove_map_event",
			success: true,
			message: `删除地图事件成功`,
			details: { id: validated.eventId }
		});
	}

	/**
	 * Game Phase Operations
	 */

	/**
	 * Get all game phases
	 * @returns All game phases organized by type
	 */
	async getPhases(): Promise<any> {
		const mapDataStore = useMapDataStore();
		return mapDataStore.phases;
	}

	/**
	 * Add a new game phase
	 * @param data - Game phase data
	 * @returns The created game phase
	 */
	async addPhase(data: {
		id: string;
		name: string;
		description: string;
		phaseType: PhaseType;
		mark?: string;
		from: string;
		initEventCode: string;
	}): Promise<any> {
		// 1. Validate input
		const validated = AddPhaseSchema.parse(data);

		// 2. Get Store
		const mapDataStore = useMapDataStore();

		// 3. Construct phase object
		const newPhase = {
			id: validated.id,
			name: validated.name,
			description: validated.description,
			mark: validated.mark,
			from: validated.from,
			initEventCode: validated.initEventCode,
		};

		// 4. Add to the appropriate phase category
		const phaseType = validated.phaseType;
		if (mapDataStore.phases[phaseType]) {
			(mapDataStore.phases[phaseType] as any).push(newPhase);
		} else {
			throw new Error(`Invalid phase type: ${phaseType}`);
		}

		// 5. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "add_phase",
			success: true,
			message: `添加游戏阶段成功: ${validated.name}`,
			details: { id: validated.id, name: validated.name, phaseType }
		});

		return newPhase;
	}

	/**
	 * Update an existing game phase
	 * @param data - Game phase update data
	 * @returns The updated game phase
	 */
	async updatePhase(data: {
		phaseId: string;
		phaseType: PhaseType;
		name?: string;
		description?: string;
		mark?: string;
		initEventCode?: string;
	}): Promise<any> {
		// 1. Validate input
		const validated = UpdatePhaseSchema.parse(data);

		// 2. Get Store and find phase
		const mapDataStore = useMapDataStore();
		const phaseArray = mapDataStore.phases[validated.phaseType];
		if (!phaseArray) {
			throw new Error(`Phase type not found: ${validated.phaseType}`);
		}

		const phase = phaseArray.find((p: any) => p.id === validated.phaseId);
		if (!phase) {
			throw new Error(`Phase not found: ${validated.phaseId}`);
		}

		// 3. Update fields
		if (validated.name !== undefined) phase.name = validated.name;
		if (validated.description !== undefined) phase.description = validated.description;
		if (validated.mark !== undefined) phase.mark = GamePhaseMark[validated.mark as keyof typeof GamePhaseMark];
		if (validated.initEventCode !== undefined) phase.initEventCode = validated.initEventCode;

		// 4. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "update_phase",
			success: true,
			message: `更新游戏阶段成功: ${phase.name}`,
			details: { id: validated.phaseId, name: phase.name }
		});

		return phase;
	}

	/**
	 * Remove a game phase
	 * @param phaseId - The ID of the phase to remove
	 * @param phaseType - The type of the phase
	 */
	async removePhase(phaseId: string, phaseType: PhaseType): Promise<void> {
		// 1. Validate input
		const validated = RemovePhaseSchema.parse({ phaseId, phaseType });

		// 2. Get Store and find phase
		const mapDataStore = useMapDataStore();
		const phaseArray = mapDataStore.phases[validated.phaseType];
		if (!phaseArray) {
			throw new Error(`Phase type not found: ${validated.phaseType}`);
		}

		const index = phaseArray.findIndex((p: any) => p.id === validated.phaseId);
		if (index < 0) {
			throw new Error(`Phase not found: ${validated.phaseId}`);
		}

		// 3. Remove phase
		phaseArray.splice(index, 1);

		// 4. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "remove_phase",
			success: true,
			message: `删除游戏阶段成功`,
			details: { id: validated.phaseId, phaseType }
		});
	}

	/**
	 * MapItem Query Operations
	 */

	/**
	 * List all map items with summary info
	 * @returns MapItem summary list
	 */
	listMapItems(): any[] {
		const mapDataStore = useMapDataStore();
		return mapDataStore.mapItems.map((item) => ({
			id: item.id,
			typeName: item.type.name,
			typeId: item.type.id,
			x: item.x,
			y: item.y,
			rotation: item.rotation,
			hasProperty: !!item.property,
			mapEventId: item.mapEventId,
			linkto: item.linkto,
			beLinked: item.beLinked,
		}));
	}

	/**
	 * Get a single map item with full details
	 * @param mapItemId - The map item ID
	 * @returns Full map item info including property
	 */
	getMapItem(mapItemId: string): any {
		const mapDataStore = useMapDataStore();
		const item = mapDataStore.findMapItemById(mapItemId);
		if (!item) {
			throw new Error(`MapItem 不存在: ${mapItemId}`);
		}
		return item;
	}

	/**
	 * Extra Libraries Operations
	 */

	/**
	 * Get extra libraries code
	 * @returns The extra libraries code
	 */
	async getExtraLibs(): Promise<{ code: string }> {
		const mapDataStore = useMapDataStore();
		return { code: mapDataStore.extraLibs };
	}

	/**
	 * Get all type libraries available to the code editor
	 * @returns extraLibs (user-defined code) and uiTemplateTypes (generated declarations)
	 */
	async getAllTypeLibs(): Promise<{ extraLibs: string; uiTemplateTypes: string }> {
		const mapDataStore = useMapDataStore();
		const extraLibs = mapDataStore.extraLibs || "";
		const uiTemplates = mapDataStore.uiTemplates || [];

		let uiTemplateTypes = "";
		if (uiTemplates.length > 0) {
			const declarations = uiTemplates
				.map(
					(ui) => `
    /**
     * **组件名称**: ${ui.name}
     * **slug**: ${ui.slug}
     * * ID: \`${ui.id}\`
     */
    const $ui__${ui.slug}: UISchema;
  `,
				)
				.join("\n");

			uiTemplateTypes = `
    declare global {
      ${declarations}
    }
    export {};
  `;
		}

		return { extraLibs, uiTemplateTypes };
	}

	/**
	 * Update extra libraries code
	 * @param code - The new code
	 */
	async updateExtraLibs(code: string): Promise<void> {
		// 1. Validate input
		const validated = UpdateExtraLibsSchema.parse({ code });

		// 2. Get Store and update
		const mapDataStore = useMapDataStore();
		mapDataStore.updateExtraLibs(validated.code);

		// 3. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "update_extra_libs",
			success: true,
			message: `更新额外库代码成功`,
			details: { codeLength: validated.code.length }
		});
	}

	/**
	 * Property Operations
	 */

	/**
	 * Add property to a map item
	 * @param data - { mapItemId, property fields }
	 * @returns The created PropertyInfo
	 */
	async addProperty(data: { mapItemId: string } & PropertyData): Promise<any> {
		// 1. Validate input
		const validated = AddPropertySchema.parse(data);

		// 2. Get Store, check mapItem exists and has no property
		const mapDataStore = useMapDataStore();
		const mapItem = mapDataStore.findMapItemById(validated.mapItemId);
		if (!mapItem) {
			throw new Error(`MapItem 不存在: ${validated.mapItemId}`);
		}
		if (mapItem.property) {
			throw new Error(`MapItem 已有地皮属性: ${validated.mapItemId}`);
		}

		// 3. Construct PropertyInfo object
		const property = {
			id: generateShortId('prop'),
			name: validated.property.name,
			sellCost: validated.property.sellCost,
			buildCost: validated.property.buildCost,
			level: 0,
			maxLevel: validated.property.maxLevel,
			costList: validated.property.costList,
			buildingModelIdList: validated.property.buildingModelIdList,
			customUI: validated.property.customUI,
			custom: validated.property.effectCode
				? { effectCode: validated.property.effectCode, description: `${validated.property.name} 自定义效果` }
				: undefined,
			exportData: validated.property.exportData || {},
		};

		// 4. Call Store
		mapDataStore.addProperty(validated.mapItemId, property as any);

		// 5. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "add_property",
			success: true,
			message: `添加地产成功: ${property.name}`,
			details: { mapItemId: validated.mapItemId, propertyId: property.id, name: property.name }
		});

		return property;
	}

	/**
	 * Update property on a map item (partial update)
	 * @param data - { mapItemId, optional property fields }
	 * @returns The updated PropertyInfo
	 */
	async updateProperty(data: UpdatePropertyInput): Promise<any> {
		// 1. Validate input
		const validated = UpdatePropertySchema.parse(data);

		// 2. Get Store, check mapItem and property exist
		const mapDataStore = useMapDataStore();
		const mapItem = mapDataStore.findMapItemById(validated.mapItemId);
		if (!mapItem) {
			throw new Error(`MapItem 不存在: ${validated.mapItemId}`);
		}
		if (!mapItem.property) {
			throw new Error(`MapItem 没有地皮属性: ${validated.mapItemId}`);
		}

		// 3. Merge updated fields
		const existing = mapItem.property;
		if (validated.property.name !== undefined) existing.name = validated.property.name;
		if (validated.property.sellCost !== undefined) existing.sellCost = validated.property.sellCost;
		if (validated.property.buildCost !== undefined) existing.buildCost = validated.property.buildCost;
		if (validated.property.maxLevel !== undefined) existing.maxLevel = validated.property.maxLevel;
		if (validated.property.costList !== undefined) existing.costList = validated.property.costList;
		if (validated.property.buildingModelIdList !== undefined) existing.buildingModelIdList = validated.property.buildingModelIdList;
		if (validated.property.customUI !== undefined) existing.customUI = validated.property.customUI;
		if (validated.property.exportData !== undefined) existing.exportData = validated.property.exportData;
		if (validated.property.effectCode !== undefined) {
			if (validated.property.effectCode) {
				existing.custom = { effectCode: validated.property.effectCode, description: `${existing.name} 自定义效果` };
			} else {
				existing.custom = undefined;
			}
		}

		// 4. Call Store
		mapDataStore.editProperty(validated.mapItemId, existing as any);

		// 5. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "update_property",
			success: true,
			message: `更新地产成功: ${existing.name}`,
			details: { mapItemId: validated.mapItemId, propertyId: existing.id }
		});

		return existing;
	}

	/**
	 * Remove property from a map item
	 * @param mapItemId - The map item ID
	 */
	async removeProperty(mapItemId: string): Promise<void> {
		// 1. Validate input
		const validated = RemovePropertySchema.parse({ mapItemId });

		// 2. Check mapItem and property exist
		const mapDataStore = useMapDataStore();
		const mapItem = mapDataStore.findMapItemById(validated.mapItemId);
		if (!mapItem) {
			throw new Error(`MapItem 不存在: ${validated.mapItemId}`);
		}
		if (!mapItem.property) {
			throw new Error(`MapItem 没有地皮属性: ${validated.mapItemId}`);
		}

		// 3. Call Store
		mapDataStore.removeProperty(validated.mapItemId);

		// 4. Send event notification
		eventBus.emit("mcp-operation", {
			operation: "remove_property",
			success: true,
			message: `删除地产成功`,
			details: { mapItemId: validated.mapItemId }
		});
	}
}

/**
 * Singleton instance of the Map Content Service
 */
export const mapContentService = new MapContentService();
