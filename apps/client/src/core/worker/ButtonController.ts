import type { GameProcess } from './GameProcessWorker';

/**
 * 按钮控制器类
 * 用于控制动态按钮的状态和生命周期
 */
export class ButtonController {
	private removed: boolean = false;

	constructor(
		private buttonId: string,
		private playerId: string,
		private gameProcess: GameProcess
	) {}

	/**
	 * 设置按钮启用状态
	 * @param enabled 是否启用
	 */
	setEnabled(enabled: boolean): void {
		if (this.removed) return;
		this.gameProcess.setButtonEnabled(this.playerId, this.buttonId, enabled);
	}

	/**
	 * 设置按钮可见性
	 * @param visible 是否可见
	 */
	setVisible(visible: boolean): void {
		if (this.removed) return;
		this.gameProcess.setButtonVisible(this.playerId, this.buttonId, visible);
	}

	/**
	 * 更新按钮文案
	 * @param text 新的按钮文案
	 */
	setText(text: string): void {
		if (this.removed) return;
		this.gameProcess.setButtonText(this.playerId, this.buttonId, text);
	}

	/**
	 * 移除按钮
	 */
	remove(): void {
		if (this.removed) return;
		this.removed = true;
		this.gameProcess.removeButton(this.playerId, this.buttonId);
	}

	/**
	 * 获取按钮ID
	 */
	getButtonId(): string {
		return this.buttonId;
	}

	/**
	 * 获取玩家ID
	 */
	getPlayerId(): string {
		return this.playerId;
	}
}
