import { AIDecisionRequest } from "@mine-monopoly/types";

/**
 * 远程模型现在直接依赖自然语言描述与结构化执行合同。
 * 保留该类仅为了让旧的调用点继续可编译。
 */
export class DecisionEnricher {
	enrich<T extends AIDecisionRequest>(request: T): T {
		return request;
	}
}
