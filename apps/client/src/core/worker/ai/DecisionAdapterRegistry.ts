import { AIDecisionOption, AIDecisionRequest } from "@mine-monopoly/types";

export function mergeAIDecisionSemantics(): undefined {
	return undefined;
}

/**
 * 兼容保留的空注册表。
 * 旧的 semantics 适配器链已经下线，远程模型直接读取描述和 payload。
 */
export class DecisionAdapterRegistry {
	enrichRequest(_request: AIDecisionRequest): undefined {
		return undefined;
	}

	enrichOption(_request: AIDecisionRequest, _option: AIDecisionOption): undefined {
		return undefined;
	}
}
