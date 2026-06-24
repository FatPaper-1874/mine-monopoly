/**
 * Worker 安全沙盒 —— Phase 1
 * 在所有自定义地图代码执行之前调用，切断危险 Web API
 */

// 危险 API 黑名单
const FORBIDDEN_APIS = [
  "importScripts",    // 远程脚本加载
  "fetch",            // 网络外连
  "XMLHttpRequest",   // 网络外连
  "WebSocket",        // 持久外连
  "EventSource",      // SSE 长连接
] as const;

/**
 * 从 Worker 全局作用域中移除危险 API
 * 使用 Object.defineProperty 设为 undefined + writable:false，
 * 比 delete 更彻底 —— delete 可能被恢复，也不适用于 non-configurable 属性
 */
function stripDangerousAPIs(): void {
  for (const key of FORBIDDEN_APIS) {
    try {
      Object.defineProperty(self, key, {
        value: undefined,
        writable: false,
        configurable: false,
      });
    } catch {
      // 某些环境可能已经 non-configurable，安全忽略
    }
  }
}

/**
 * 保护核心原型链不被自定义代码篡改
 * 冻结后，恶意代码无法修改 String.prototype / Array.prototype 等来影响其他逻辑
 */
function freezeCorePrototypes(): void {
  const coreConstructors = [
    Object,
    Array,
    String,
    Number,
    Boolean,
    Function,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    RegExp,
    Date,
    Error,
    TypeError,
    SyntaxError,
    ReferenceError,
    RangeError,
  ];

  for (const Ctor of coreConstructors) {
    try {
      Object.freeze(Ctor.prototype);
    } catch {
      // 某些原型可能已经 frozen，忽略
    }
  }
}

/**
 * 入口：在 Worker 启动时调用（任何游戏逻辑之前）
 */
export function applyWorkerSandbox(): void {
  stripDangerousAPIs();
  freezeCorePrototypes();
}
