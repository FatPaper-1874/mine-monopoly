import { AIDecisionSemanticHint } from "./ai";

/**
 * 按钮配置接口
 */
export interface ButtonConfig {
  /** 按钮唯一标识 */
  id: string;

  /** 所属玩家 ID */
  playerId: string;

  /** 按钮文案 */
  text: string;

  /** 是否启用 */
  enabled: boolean;

  /** 是否可见 */
  visible: boolean;

  /** AI 辅助语义 */
  ai?: AIDecisionSemanticHint;

  /** 点击回调 */
  callback: () => Promise<void> | void;
}

/**
 * 按钮注册消息
 */
export interface ButtonRegisterMessage {
  /** 按钮 ID */
  buttonId: string;

  /** 按钮文案 */
  text: string;

  /** 是否启用 */
  enabled: boolean;

  /** 是否可见 */
  visible: boolean;
}

/**
 * 按钮状态变更消息
 */
export interface ButtonStateChangedMessage {
  /** 按钮 ID */
  buttonId: string;

  /** 启用状态变更 */
  enabled?: boolean;

  /** 可见状态变更 */
  visible?: boolean;

  /** 文案变更 */
  text?: string;
}

/**
 * 按钮移除消息
 */
export interface ButtonRemoveMessage {
  /** 按钮 ID */
  buttonId: string;
}

/**
 * 动态按钮点击操作结果
 */
export interface DynamicButtonClickOperationResult {
  /** 被点击的按钮 ID */
  buttonId: string;

  /** 是否执行成功 */
  success: boolean;

  /** 失败原因 */
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
