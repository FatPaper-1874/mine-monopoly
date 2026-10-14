/**
 * 出站 HTTP 请求的通用重试工具。
 *
 * 通知类派发（通用 webhook / 飞书）共用同一张等待时间表：首次立即发送，之后 2 秒、6 秒各重试一次。
 * 使用方只需提供「发一次并判定成功/失败」的函数，失败时抛错即可。
 */

/** 各次尝试前的等待时间（毫秒）：第 1 次立即，第 2、3 次分别等待 2 秒、6 秒 */
export const RETRY_DELAYS_MS = [0, 2000, 6000];

export function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 把尝试次数收敛到 [1, RETRY_DELAYS_MS.length]；不传则用满重试表 */
export function resolveAttempts(attempts?: number): number {
	return Math.max(1, Math.min(attempts ?? RETRY_DELAYS_MS.length, RETRY_DELAYS_MS.length));
}

/**
 * 统一的失败原因文案（与 axios 错误对象兼容）：
 * 有响应时给 HTTP 状态码，否则给 axios 错误码（ECONNREFUSED/ETIMEDOUT…）或原始 message。
 */
export function formatRequestError(error: any): string {
	return error?.response ? `HTTP ${error.response.status}` : error?.code || error?.message || "unknown error";
}

export interface RetryContext {
	/** 当前是第几次尝试（从 1 开始） */
	attempt: number;
	/** 总尝试次数 */
	maxAttempts: number;
	/** 本次失败原因（已由 formatRequestError 归一化） */
	error: string;
}

/**
 * 按重试表执行一次发送。
 *
 * - `send` 返回值视为成功结果；抛错则按表等待后重试
 * - 每次都失败时返回 null（调用方据此返回 `{ ok: false, message }`），**永不抛出**
 * - 每次失败都回调 `onError` 供使用方按自己的日志格式告警
 */
export async function runWithRetry<T>(
	send: () => Promise<T>,
	options?: { attempts?: number; onError?: (context: RetryContext) => void }
): Promise<T | null> {
	const maxAttempts = resolveAttempts(options?.attempts);
	let lastResult: T | null = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (RETRY_DELAYS_MS[attempt] > 0) await sleep(RETRY_DELAYS_MS[attempt]);
		try {
			return await send();
		} catch (e: any) {
			lastResult = null;
			options?.onError?.({ attempt: attempt + 1, maxAttempts, error: formatRequestError(e) });
		}
	}

	return lastResult;
}
