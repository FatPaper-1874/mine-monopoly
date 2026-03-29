/**
 * 按钮配置接口
 */
export interface ButtonConfig {
  id: string; // 按钮唯一标识
  playerId: string; // 所属玩家ID
  text: string; // 按钮文案
  enabled: boolean; // 是否启用
  visible: boolean; // 是否可见
  callback: () => Promise<void> | void; // 点击回调
}

/**
 * 按钮注册消息
 */
export interface ButtonRegisterMessage {
  buttonId: string;
  text: string;
  enabled: boolean;
  visible: boolean;
}

/**
 * 按钮状态变更消息
 */
export interface ButtonStateChangedMessage {
  buttonId: string;
  enabled?: boolean;
  visible?: boolean;
  text?: string;
}

/**
 * 按钮移除消息
 */
export interface ButtonRemoveMessage {
  buttonId: string;
}

/**
 * 动态按钮点击操作结果
 */
export interface DynamicButtonClickOperationResult {
  buttonId: string;
  success: boolean;
  error?: string;
}

/**
 * 按钮控制器接口
 * 用于控制动态按钮的状态和生命周期
 */
export interface ButtonController {
  /**
   * 设置按钮启用状态
   * @param enabled - 是否启用
   */
  setEnabled(enabled: boolean): void;

  /**
   * 设置按钮可见性
   * @param visible - 是否可见
   */
  setVisible(visible: boolean): void;

  /**
   * 更新按钮文案
   * @param text - 新的按钮文案
   */
  setText(text: string): void;

  /**
   * 移除按钮
   */
  remove(): void;

  /**
   * 获取按钮ID
   */
  getButtonId(): string;

  /**
   * 获取玩家ID
   */
  getPlayerId(): string;
}
