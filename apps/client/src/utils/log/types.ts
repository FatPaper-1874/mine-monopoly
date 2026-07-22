/**
 * 错误处理系统类型定义
 * 用于统一日志服务、错误分类和持久化
 */

/**
 * 错误严重程度等级
 */
export enum ErrorLevel {
  FATAL = 'fatal',     // 致命：需要用户干预（如认证失败）
  ERROR = 'error',     // 错误：功能受损但可继续（如 API 失败）
  WARNING = 'warning', // 警告：不影响功能（如资源加载慢）
  INFO = 'info'        // 信息：仅记录（如操作日志）
}

/**
 * 错误分类
 */
export enum ErrorCategory {
  NETWORK = 'network',                // 网络相关
  GAME_LOGIC = 'game',                // 游戏逻辑
  UI_RENDER = 'render',               // UI 渲染
  WORKER = 'worker',                  // Web Worker
  AUTH = 'auth',                      // 认证授权
  COMPONENT_VALIDATION = 'component_validation',  // 组件验证失败
  GAME_RUNTIME = 'game_runtime',      // 游戏运行时错误
  INIT_TIMEOUT = 'init_timeout',      // 初始化超时
  UNKNOWN = 'unknown'                 // 未知
}

/**
 * 兼容旧版本的错误类型
 * 扩展为支持新的错误类型字符串
 */
export type LegacyErrorType = "Vue" | "Promise" | "Runtime" | "Worker" | "Network" | "Console" | string;

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  /** 时间戳 */
  timestamp: string;
  /** 当前 URL */
  url: string;
  /** 用户代理 */
  userAgent: string;
  /** 屏幕信息 */
  screenInfo?: string;
  /** 内存使用情况 */
  memoryUsage?: {
    usedJSHeapSize: string;
    totalJSHeapSize: string;
  };
  /** 游戏状态快照（Worker 错误时） */
  gameState?: Record<string, any>;
  /** 组件名称（Vue 错误时） */
  componentName?: string;
  /** 组件 Props（Vue 错误时） */
  componentProps?: string;
  /** 网络请求配置（网络错误时） */
  requestConfig?: {
    url: string;
    method: string;
    data?: any;
  };
  /** 网络响应信息（网络错误时） */
  responseInfo?: {
    status: number;
    statusText: string;
    data?: any;
  };
}

/**
 * 增强的错误日志数据结构
 */
export interface LogErrorData {
  /** 日志唯一 ID */
  id: string;
  /** 错误等级 */
  level: ErrorLevel;
  /** 错误分类 */
  category: ErrorCategory;
  /** 兼容旧版本的错误类型 */
  type?: LegacyErrorType;
  /** 错误消息 */
  message: string;
  /** 堆栈跟踪 */
  stack?: string;
  /** 额外信息（如 Vue 组件的 info） */
  info?: string;
  /** 文件名（运行时错误） */
  filename?: string;
  /** 行号（运行时错误） */
  lineno?: number;
  /** 列号（运行时错误） */
  colno?: number;
  /** 错误上下文 */
  context: ErrorContext;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 日志筛选条件
 */
export interface LogFilter {
  /** 错误等级筛选 */
  levels?: ErrorLevel[];
  /** 错误分类筛选 */
  categories?: ErrorCategory[];
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 关键词搜索 */
  keyword?: string;
}

/**
 * 日志导出格式
 */
export type LogExportFormat = 'txt' | 'json';

/**
 * 日志存储接口
 */
export interface ILogStorage {
  /** 添加日志 */
  add(log: LogErrorData): Promise<void>;
  /** 获取所有日志 */
  getAll(): Promise<LogErrorData[]>;
  /** 根据筛选条件获取日志 */
  get(filter?: LogFilter): Promise<LogErrorData[]>;
  /** 根据时间清理日志 */
  clear(before?: Date): Promise<void>;
  /** 根据ID删除单条日志 */
  deleteById(id: string): Promise<void>;
  /** 获取日志数量 */
  count(): Promise<number>;
}

/**
 * 重连配置
 */
export interface ReconnectConfig {
  /** 重连间隔（毫秒），默认 3000 */
  retryInterval?: number;
  /** 最大重试次数，默认 Infinity（无限） */
  maxRetries?: number;
  /** 是否显示倒计时，默认 true */
  showCountdown?: boolean;
  /** 自定义重连提示内容 */
  getDisplayState?: (attempt: number, maxRetries: number) => {
    title?: string;
    message: string;
    detail?: string;
    actionLabel?: string;
  };
  /** 重连回调函数 */
  onRetry?: (attempt: number, maxRetries: number) => void;
  /** 成功回调 */
  onSuccess?: () => void;
  /** 失败回调 */
  onFail?: (error: Error) => void;
  /** 取消回调 */
  onCancel?: () => void;
}

/**
 * 重试配置（用于异步任务队列）
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 可重试的错误类型/消息 */
  retryableErrors: string[];
}

/**
 * 执行策略（用于异步任务队列）
 */
export interface ExecutionStrategy<T = any> {
  /** 重试配置 */
  retry?: RetryConfig;
  /** 失败后的降级函数 */
  fallback?: () => T | Promise<T>;
  /** 失败是否抛出异常 */
  throwOnFailure?: boolean;
}

/**
 * 日志服务接口
 */
export interface ILogService {
  /** 记录错误日志 */
  error(data: Omit<LogErrorData, 'id' | 'level' | 'context' | 'createdAt'> & { level?: ErrorLevel; context?: Partial<ErrorContext> }): Promise<void>;
  /** 记录警告日志 */
  warn(data: Omit<LogErrorData, 'id' | 'level' | 'context' | 'createdAt'> & { level?: ErrorLevel; context?: Partial<ErrorContext> }): Promise<void>;
  /** 记录信息日志 */
  info(data: Omit<LogErrorData, 'id' | 'level' | 'context' | 'createdAt'> & { level?: ErrorLevel; context?: Partial<ErrorContext> }): Promise<void>;
  /** 根据筛选条件获取日志 */
  getLogs(filter?: LogFilter): Promise<LogErrorData[]>;
  /** 导出日志 */
  export(format: LogExportFormat): Promise<Blob>;
  /** 清空日志 */
  clear(before?: Date): Promise<void>;
  /** 删除单条日志 */
  deleteById(id: string): Promise<void>;
  /** 获取日志数量 */
  count(): Promise<number>;
}
