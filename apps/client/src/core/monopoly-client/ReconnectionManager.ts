/**
 * WebSocket 自动重连管理器
 * 固定间隔重连策略，支持用户取消
 */

import type { ReconnectConfig } from "@src/utils/log/types";
import { FPMessageCard, type MessageCardHandle } from "@src/components/utils/fp-message-card";
import { h } from "vue";

/**
 * 重连状态
 */
enum ReconnectState {
  IDLE = 'idle',           // 空闲状态
  RECONNECTING = 'reconnecting', // 重连中
  CONNECTED = 'connected', // 已连接
  CANCELLED = 'cancelled', // 已取消
  FAILED = 'failed'        // 重连失败
}

/**
 * 重连管理器类
 */
export class ReconnectionManager {
  private config: Required<ReconnectConfig>;
  private state: ReconnectState = ReconnectState.IDLE;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private currentMessageCard: MessageCardHandle | null = null;

  /**
   * 连接函数（由外部提供）
   */
  private connectFn: () => Promise<void>;

  constructor(
    connectFn: () => Promise<void>,
    config: ReconnectConfig = {}
  ) {
    this.connectFn = connectFn;
    this.config = {
      retryInterval: config.retryInterval ?? 3000,
      maxRetries: config.maxRetries ?? Number.POSITIVE_INFINITY,
      showCountdown: config.showCountdown ?? true,
      getDisplayState: config.getDisplayState ?? ((attempt, maxRetries) => ({
        title: "重连中",
        message: `正在尝试重新连接... (${attempt}/${maxRetries === Number.POSITIVE_INFINITY ? "∞" : maxRetries})`,
        actionLabel: "放弃重连",
      })),
      onRetry: config.onRetry ?? (() => {}),
      onSuccess: config.onSuccess ?? (() => {}),
      onFail: config.onFail ?? (() => {}),
      onCancel: config.onCancel ?? (() => {})
    };
  }

  /**
   * 开始重连
   */
  start(): void {
    if (this.state === ReconnectState.RECONNECTING) {
      return; // 已经在重连中
    }

    this.state = ReconnectState.RECONNECTING;
    this.retryCount = 0;

    this.showReconnectMessage();
    this.scheduleRetry();
  }

  /**
   * 停止重连
   */
  stop(): void {
    this.clearTimers();
    this.closeMessageCard();
    this.state = ReconnectState.IDLE;
    this.retryCount = 0;
  }

  /**
   * 取消重连（用户主动取消）
   */
  cancel(): void {
    this.clearTimers();
    this.closeMessageCard();
    this.state = ReconnectState.CANCELLED;
    this.config.onCancel();
  }

  /**
   * 标记连接成功
   * 由外部在连接成功后调用
   */
  markConnected(): void {
    if (this.state === ReconnectState.RECONNECTING) {
      this.clearTimers();
      this.closeMessageCard();
      this.state = ReconnectState.CONNECTED;
      this.retryCount = 0;
      this.config.onSuccess();
    }
  }

  /**
   * 获取当前状态
   */
  getState(): ReconnectState {
    return this.state;
  }

  /**
   * 是否正在重连
   */
  isReconnecting(): boolean {
    return this.state === ReconnectState.RECONNECTING;
  }

  /**
   * 获取当前重试次数
   */
  getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * 显示重连消息卡片
   */
  private showReconnectMessage(): void {
    // 先关闭旧消息
    this.closeMessageCard();
    const displayState = this.config.getDisplayState(this.retryCount, this.config.maxRetries);

    // 使用 VNode 创建内容，包含放弃按钮
    const content = h('div', {
      style: 'text-align: center; padding: 0.625rem;'
    }, [
      h('div', { style: 'font-size: 1.5rem; margin-bottom: 0.625rem;' }, '⚠️'),
      h('div', { style: 'font-weight: bold; margin-bottom: 0.3125rem;' }, displayState.message),
      h('div', {
        style: 'font-size: 0.875rem; color: #666; margin-bottom: 0.9375rem;'
      }, displayState.detail || '系统正在尝试恢复连接'),
      h('button', {
        style: `
          padding: 0.5rem 1.25rem;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
        `,
        onClick: () => this.cancel()
      }, displayState.actionLabel || '放弃重连')
    ]);

    this.currentMessageCard = FPMessageCard({
      title: displayState.title || '重连中',
      content,
      duration: 0, // 不自动关闭
    });
  }

  /**
   * 更新重连消息卡片
   */
  private updateReconnectMessage(): void {
    if (this.config.showCountdown) {
      this.showReconnectMessage();
    }
  }

  /**
   * 关闭消息卡片
   */
  private closeMessageCard(): void {
    if (this.currentMessageCard) {
      this.currentMessageCard.close();
      this.currentMessageCard = null;
    }
  }

  /**
   * 安排下一次重试
   */
  private scheduleRetry(): void {
    this.clearTimers();

    this.retryTimer = setInterval(async () => {
      await this.performRetry();
    }, this.config.retryInterval);
  }

  /**
   * 执行重试
   */
  private async performRetry(): Promise<void> {
    // 检查是否超过最大重试次数
    if (this.retryCount >= this.config.maxRetries) {
      this.handleMaxRetriesReached();
      return;
    }

    this.retryCount++;
    this.config.onRetry(this.retryCount, this.config.maxRetries);

    // 更新消息显示
    this.updateReconnectMessage();

    try {
      // 尝试连接
      await this.connectFn();

      // 连接成功，标记状态
      this.markConnected();
    } catch (error) {
      // 连接失败，继续重试
      console.error(`[ReconnectionManager] 重连失败 (${this.retryCount}/${this.config.maxRetries}):`, error);

      // 检查是否达到最大重试次数
      if (this.retryCount >= this.config.maxRetries) {
        this.handleMaxRetriesReached();
      }
    }
  }

  /**
   * 处理达到最大重试次数
   */
  private handleMaxRetriesReached(): void {
    this.clearTimers();
    this.closeMessageCard();
    this.state = ReconnectState.FAILED;

    const error = new Error(`重连失败：已达到最大重试次数 (${this.config.maxRetries})`);
    this.config.onFail(error);
  }

  /**
   * 清除所有定时器
   */
  private clearTimers(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stop();
  }
}

export default ReconnectionManager;
