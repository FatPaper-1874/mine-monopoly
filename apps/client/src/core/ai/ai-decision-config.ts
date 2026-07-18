import type {
	AIDecisionConfig,
	AIDecisionProviderMode,
	AIRemoteLLMConfig,
	AIRemoteLLMProfile,
	AIRemoteLLMProviderKind,
} from "@mine-monopoly/types";

const DEFAULT_REMOTE_TIMEOUT_MS = 30000;

function normalizeProviderKind(provider: unknown): AIRemoteLLMProviderKind {
	return provider === "anthropic" ? "anthropic" : "openai-compatible";
}

export function createDefaultRemoteLLMConfig(): AIRemoteLLMConfig {
	return {
		provider: "openai-compatible",
		baseUrl: "",
		apiKey: "",
		model: "",
		timeoutMs: DEFAULT_REMOTE_TIMEOUT_MS,
	};
}

export function normalizeRemoteLLMConfig(config: Partial<AIRemoteLLMConfig> | undefined): AIRemoteLLMConfig {
	const fallback = createDefaultRemoteLLMConfig();
	return {
		id: typeof config?.id === "string" && config.id.trim() ? config.id.trim() : undefined,
		name: typeof config?.name === "string" && config.name.trim() ? config.name.trim() : undefined,
		provider: normalizeProviderKind(config?.provider),
		baseUrl: typeof config?.baseUrl === "string" ? config.baseUrl.trim() : fallback.baseUrl,
		apiKey: typeof config?.apiKey === "string" ? config.apiKey.trim() : fallback.apiKey,
		model: typeof config?.model === "string" ? config.model.trim() : fallback.model,
		timeoutMs:
			typeof config?.timeoutMs === "number" && Number.isFinite(config.timeoutMs)
				? config.timeoutMs
				: fallback.timeoutMs,
	};
}

export function normalizeRemoteLLMProfile(profile: Partial<AIRemoteLLMProfile> | undefined, index: number): AIRemoteLLMProfile {
	const normalized = normalizeRemoteLLMConfig(profile);
	return {
		id: typeof profile?.id === "string" && profile.id.trim() ? profile.id.trim() : `remote-profile-${index + 1}`,
		name: typeof profile?.name === "string" && profile.name.trim() ? profile.name.trim() : `远端配置 ${index + 1}`,
		...normalized,
	};
}

export function normalizeAIDecisionMode(mode: unknown): AIDecisionProviderMode {
	return mode === "remote" ? "remote" : "local";
}

export function normalizeAIDecisionConfig(config: Partial<AIDecisionConfig> | undefined): AIDecisionConfig {
	const normalizedProfiles = Array.isArray(config?.remoteProfiles)
		? config.remoteProfiles.map((profile, index) => normalizeRemoteLLMProfile(profile, index))
		: [];

	const defaultRemoteProfileId =
		typeof config?.defaultRemoteProfileId === "string" && config.defaultRemoteProfileId.trim()
			? config.defaultRemoteProfileId.trim()
			: undefined;

	return {
		mode: normalizeAIDecisionMode(config?.mode),
		remote: normalizeRemoteLLMConfig(config?.remote),
		remoteProfiles: normalizedProfiles,
		defaultRemoteProfileId:
			defaultRemoteProfileId && normalizedProfiles.some((profile) => profile.id === defaultRemoteProfileId)
				? defaultRemoteProfileId
				: undefined,
		contextMemoryLimit:
			typeof config?.contextMemoryLimit === "number" && Number.isFinite(config.contextMemoryLimit)
				? Math.max(0, Math.min(20, Math.floor(config.contextMemoryLimit)))
				: 6,
	};
}
