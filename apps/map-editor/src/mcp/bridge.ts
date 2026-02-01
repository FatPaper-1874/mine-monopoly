/**
 * IPC Bridge for MCP Server to communicate with Pinia Stores
 *
 * In the Electron main process, this bridge will communicate with
 * the renderer process to access Pinia stores.
 */

export type MCPToolName =
	// Map info tools
	| "get_map_info"
	| "update_map_info"
	| "get_map_summary"
	| "set_background_image"
	| "set_cover_image"
	// Map item tools
	| "get_map_items"
	| "add_map_item"
	| "remove_map_item"
	| "update_map_item"
	| "link_map_items"
	| "unlink_map_item"
	| "get_map_index"
	| "set_map_index"
	// Map item type tools
	| "get_map_item_types"
	| "add_map_item_type"
	| "remove_map_item_type"
	// Map event tools
	| "get_map_events"
	| "get_map_event_by_id"
	| "add_map_event"
	| "update_map_event"
	| "remove_map_event"
	| "link_event_to_item"
	| "unlink_event_from_item"
	// Resource tools
	| "list_models"
	| "list_images"
	| "get_resource_by_id"
	| "add_temp_model"
	| "add_temp_image"
	// Role tools
	| "get_roles"
	| "add_role"
	| "update_role"
	| "remove_role"
	// Chance card tools
	| "get_chance_cards"
	| "add_chance_card"
	| "update_chance_card"
	| "remove_chance_card"
	// Property tools
	| "add_property"
	| "update_property"
	| "remove_property"
	// Game phase tools
	| "get_phases"
	| "add_phase"
	| "remove_phase"
	| "update_phase"
	// UI template tools
	| "get_ui_templates"
	| "add_ui_template"
	| "remove_ui_template"
	| "update_ui_template"
	// Custom UI tools
	| "get_custom_uis"
	| "add_custom_ui"
	| "remove_custom_ui"
	| "update_custom_ui"
	// Game setting tools
	| "get_game_setting_form"
	| "update_game_setting_form"
	// Extra libs tools
	| "get_extra_libs"
	| "update_extra_libs"
	// File operation tools
	| "create_new_map"
	| "load_map_file"
	| "save_map_file"
	| "get_current_file_path"
	// Analysis tools
	| "validate_map"
	| "find_duplicates"
	| "analyze_map_layout";

/**
 * MCP tool handler type
 */
export type MCPToolHandler = (args: any) => Promise<any>;

/**
 * Bridge interface for accessing Pinia stores from main process
 *
 * In production, this will be implemented via IPC communication
 * with the renderer process.
 */
export interface IPCBridge {
	/**
	 * Invoke a tool in the renderer process
	 */
	invokeTool: (toolName: MCPToolName, args: any) => Promise<any>;

	/**
	 * Send a message to the renderer process
	 */
	sendMessage: (channel: string, data: any) => void;

	/**
	 * Register a handler for messages from renderer
	 */
	onMessage: (channel: string, callback: (data: any) => void) => void;
}

/**
 * Create a mock bridge for testing (used when not in Electron)
 */
export function createMockBridge(): IPCBridge {
	return {
		invokeTool: async (toolName, args) => {
			console.log(`[Mock Bridge] Invoking tool: ${toolName}`, args);
			return { success: false, error: "Not implemented in mock bridge" };
		},
		sendMessage: (channel, data) => {
			console.log(`[Mock Bridge] Send message: ${channel}`, data);
		},
		onMessage: (channel, callback) => {
			console.log(`[Mock Bridge] Register handler: ${channel}`);
		},
	};
}

let currentBridge: IPCBridge | null = null;

/**
 * Set the current bridge instance
 */
export function setBridge(bridge: IPCBridge) {
	currentBridge = bridge;
}

/**
 * Get the current bridge instance
 */
export function getBridge(): IPCBridge {
	if (!currentBridge) {
		// Return mock bridge for testing
		return createMockBridge();
	}
	return currentBridge;
}

/**
 * Invoke a tool through the bridge
 */
export async function invokeTool(toolName: MCPToolName, args: any = {}): Promise<any> {
	const bridge = getBridge();
	return await bridge.invokeTool(toolName, args);
}
