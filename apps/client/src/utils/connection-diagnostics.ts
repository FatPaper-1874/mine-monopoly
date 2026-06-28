/**
 * 连接诊断工具 — 用于排查 WebRTC/PeerJS 连接失败的原因
 *
 * 启用方式：
 *   1. URL 参数: ?debug_connection=1
 *   2. localStorage: debug_connection = "1"
 *   3. 开发环境默认开启
 *
 * 诊断项目：
 *   - 各阶段耗时（HTTP 请求 → 信令连接 → DataConnection → JoinRoom）
 *   - PeerJS 信令服务器连接状态
 *   - ICE 候选收集情况
 *   - TURN/STUN 服务器可达性
 *   - DataConnection 状态变迁
 */

import type { DataConnection } from "peerjs";

// ============ 类型定义 ============

export interface StageTiming {
	stage: string;
	startTime: number;
	endTime: number;
	duration: number;
	success: boolean;
	error?: string;
	detail?: Record<string, unknown>;
}

export interface ConnectionReport {
	/** 报告生成时间 */
	timestamp: string;
	/** 用户代理 */
	userAgent: string;
	/** 当前页面 */
	url: string;
	/** ICE 服务器配置（已脱敏） */
	iceServers: string[];
	/** 是否前缀模式 */
	usePrefixMode: boolean;
	/** 信令服务器地址 */
	signalingHost: string;
	/** 各阶段耗时记录 */
	stages: StageTiming[];
	/** 错误汇总 */
	errors: string[];
	/** 警告汇总 */
	warnings: string[];
	/** PeerJS 事件日志 */
	peerEvents: { time: number; event: string; detail?: string }[];
	/** ICE 候选收集日志 */
	iceCandidates: { time: number; type: string; address: string; port: number; transport: string }[];
	/** 网络信息 */
	networkInfo?: {
		downlink?: number;
		rtt?: number;
		type?: string;
	};
	/** 检测到的本地网络接口 */
	localIps?: string[];
}

// ============ 单例管理器 ============

class ConnectionDiagnostics {
	private enabled = false;
	private report: ConnectionReport;
	private stageStack: { stage: string; startTime: number }[] = [];
	private peerEventLog: { time: number; event: string; detail?: string }[] = [];
	private iceCandidates: ConnectionReport["iceCandidates"] = [];
	private errors: string[] = [];
	private warnings: string[] = [];

	constructor() {
		this.report = this.createEmptyReport();
		this.checkEnabled();
	}

	private checkEnabled() {
		// URL 参数优先
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			if (params.get("debug_connection") === "1") {
				this.enabled = true;
				return;
			}
			// localStorage 次之
			try {
				if (localStorage.getItem("debug_connection") === "1") {
					this.enabled = true;
					return;
				}
			} catch {
				// localStorage 不可用
			}
		}
		// 开发环境默认开启
		if (import.meta.env.DEV) {
			this.enabled = true;
		}
	}

	private createEmptyReport(): ConnectionReport {
		return {
			timestamp: new Date().toISOString(),
			userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
			url: typeof window !== "undefined" ? window.location.href : "unknown",
			iceServers: [],
			usePrefixMode: false,
			signalingHost: "",
			stages: [],
			errors: [],
			warnings: [],
			peerEvents: [],
			iceCandidates: [],
		};
	}

	get isEnabled() {
		return this.enabled;
	}

	/** 手动开启诊断（可通过控制台调用） */
	enable() {
		this.enabled = true;
		this.reset();
		console.log("[ConnectionDiagnostics] 🔍 连接诊断已开启");
	}

	/** 重置所有诊断数据（每次新连接前调用） */
	reset() {
		this.report = this.createEmptyReport();
		this.stageStack = [];
		this.peerEventLog = [];
		this.iceCandidates = [];
		this.errors = [];
		this.warnings = [];
	}

	// ----- 基础配置 -----

	setIceServers(servers: RTCIceServer[]) {
		this.report.iceServers = servers.map((s) => {
			if (typeof s === "string") return s;
			if (Array.isArray(s.urls)) return s.urls.join(",");
			return s.urls || "unknown";
		});
		const hasTurn = this.report.iceServers.some((u) => u.includes("turn"));
		if (!hasTurn) {
			this.warn("ICE 配置中没有 TURN 服务器，跨设备连接可能失败");
		}
	}

	setSignalingInfo(host: string, usePrefix: boolean) {
		this.report.signalingHost = host;
		this.report.usePrefixMode = usePrefix;
	}

	// ----- 分阶段计时 -----

	/** 开始一个阶段 */
	stageStart(stage: string) {
		if (!this.enabled) return;
		this.stageStack.push({ stage, startTime: performance.now() });
	}

	/** 结束一个阶段（成功） */
	stageEnd(stage: string, detail?: Record<string, unknown>) {
		if (!this.enabled) return;
		const entry = this.stageStack.find((s) => s.stage === stage);
		if (!entry) {
			this.warn(`阶段 "${stage}" 未找到对应的开始记录`);
			return;
		}
		const endTime = performance.now();
		const duration = endTime - entry.startTime;
		this.report.stages.push({
			stage,
			startTime: Math.round(entry.startTime),
			endTime: Math.round(endTime),
			duration: Math.round(duration),
			success: true,
			detail,
		});
		this.stageStack = this.stageStack.filter((s) => s.stage !== stage);
	}

	/** 结束一个阶段（失败） */
	stageFail(stage: string, error: string, detail?: Record<string, unknown>) {
		if (!this.enabled) return;
		const entry = this.stageStack.find((s) => s.stage === stage);
		const endTime = performance.now();
		const duration = entry ? endTime - entry.startTime : 0;
		this.report.stages.push({
			stage,
			startTime: entry ? Math.round(entry.startTime) : 0,
			endTime: Math.round(endTime),
			duration: Math.round(duration),
			success: false,
			error,
			detail,
		});
		this.stageStack = this.stageStack.filter((s) => s.stage !== stage);
		this.errors.push(`[${stage}] ${error}`);
	}

	// ----- PeerJS 事件 -----

	logPeerEvent(event: string, detail?: string) {
		if (!this.enabled) return;
		const entry = { time: performance.now(), event, detail };
		this.peerEventLog.push(entry);
	}

	// ----- ICE 候选 -----

	logIceCandidate(candidate: RTCIceCandidate) {
		if (!this.enabled) return;
		// 使用 RTCIceCandidate 标准属性，而不是解析 SDP 字符串
		const address = candidate.address || "0.0.0.0";
		const port = candidate.port || 0;
		const protocol = candidate.protocol || "unknown";

		// 从 candidate 字符串提取候选类型（host / srflx / relay）
		let type = "unknown";
		if (candidate.candidate) {
			const parts = candidate.candidate.split(" ");
			const typeIndex = parts.findIndex((p) => p === "typ");
			if (typeIndex >= 0) type = parts[typeIndex + 1] || "unknown";
		} else if ((candidate as any).type) {
			type = (candidate as any).type;
		}

		// 统计候选类型数量
		const typeCount = this.iceCandidates.filter((c) => c.type === type).length;
		this.iceCandidates.push({
			time: performance.now(),
			type,
			address,
			port,
			transport: protocol,
		});
	}

	/** 检查是否收集到 relay 候选，没有则警告 */
	checkRelayCandidates() {
		if (!this.enabled) return;
		const hasRelay = this.iceCandidates.some((c) => c.type === "relay");
		const hasSrflx = this.iceCandidates.some((c) => c.type === "srflx");
		if (!hasRelay) {
			if (hasSrflx) {
				this.warn("未收集到 TURN relay 候选（仅有 STUN srflx）— TURN 服务器可能不可达或配置错误");
			} else {
				this.warn("未收集到 TURN relay 候选，也未见 STUN srflx — ICE 服务器可能完全不可达");
			}
		}
	}

	// ----- 错误 / 警告 -----

	error(msg: string) {
		if (!this.enabled) return;
		this.errors.push(msg);
		console.error(`[ConnectionDiagnostics] ${msg}`);
	}

	warn(msg: string) {
		if (!this.enabled) return;
		this.warnings.push(msg);
		console.warn(`[ConnectionDiagnostics] ${msg}`);
	}

	// ----- 网络信息 -----

	captureNetworkInfo() {
		if (!this.enabled) return;
		const conn = (navigator as any).connection;
		if (conn) {
			this.report.networkInfo = {
				downlink: conn.downlink,
				rtt: conn.rtt,
				type: conn.effectiveType || conn.type,
			};
		}
	}

	/** 检测本地网络接口 IP 地址 */
	async detectLocalInterfaces(): Promise<string[]> {
		if (!this.enabled) return [];

		const localIps: string[] = [];

		try {
			// 创建一个仅使用 STUN 的 RTCPeerConnection 来获取本地 IP
			const pc = new RTCPeerConnection({
				iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
			});

			const ips = await new Promise<string[]>((resolve) => {
				const seenIps = new Set<string>();
				const timeout = setTimeout(() => {
					pc.close();
					resolve(Array.from(seenIps));
				}, 3000);

				pc.onicecandidate = (event) => {
					if (event.candidate) {
						const parts = event.candidate.candidate?.split(" ") || [];
						const type = parts[7]; // typ
						const ip = parts[4]; // IP address

						if (type === "host" && ip && !seenIps.has(ip)) {
							seenIps.add(ip);
							localIps.push(ip);
						}
					} else if (pc.iceGatheringState === "complete") {
						clearTimeout(timeout);
						pc.close();
						resolve(Array.from(seenIps));
					}
				};

				pc.onicegatheringstatechange = () => {
					if (pc.iceGatheringState === "complete") {
						clearTimeout(timeout);
						pc.close();
						resolve(Array.from(seenIps));
					}
				};

				// 触发 ICE 收集
				pc.createDataChannel("test");
				pc.createOffer().then((offer) => pc.setLocalDescription(offer));
			});

			this.report.localIps = localIps;

			// 分析接口类型
			const hasPrivate = localIps.some(ip => ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172."));
			const hasPublic = localIps.some(ip => !ip.startsWith("192.168.") && !ip.startsWith("10.") && !ip.startsWith("172.") && !ip.startsWith("127."));
			const hasLoopback = localIps.some(ip => ip.startsWith("127."));

			if (hasPrivate && hasPublic) {
				this.warn("同时检测到私有 IP 和公网 IP，可能导致路由混乱");
			}
			if (hasLoopback) {
				this.warn("检测到 loopback 接口 (127.x)，可能干扰候选选择");
			}

			return localIps;
		} catch (e) {
			this.error(`本地接口检测失败: ${e}`);
			return [];
		}
	}

	/** 筛选 ICE 候选 - 优先选择局域网 IP，过滤虚拟网卡 */
	filterCandidate(candidate: RTCIceCandidate): boolean {
		if (!this.enabled || !candidate.candidate) return true;

		const parts = candidate.candidate.split(" ");
		const type = parts[7]; // typ: host/srflx/relay
		const ip = parts[4]; // IP address
		const networkId = parts[11]; // network-id

		// 对于 host 候选，优先选择 192.168.x.x (WiFi 局域网)
		if (type === "host") {
			// 跳过 loopback
			if (ip?.startsWith("127.")) {
				return false;
			}
			// 跳过 WSL/Docker 虚拟网卡 (172.x.x.x 且非宿主机网络)
			if (ip?.startsWith("172.27.") || ip?.startsWith("172.28.") || ip?.startsWith("172.29.")) {
				return false;
			}
			// 优先 WiFi 局域网
			if (ip?.startsWith("192.168.")) {
				return true;
			}
		}

		return true;
	}

	// ----- TURN/STUN 连通性测试 -----

	async testTurnServer(turnUrl: string, username: string, credential: string): Promise<boolean> {
		if (!this.enabled) return false;

		const pc = new RTCPeerConnection({
			iceServers: [{ urls: turnUrl, username, credential }],
			iceTransportPolicy: "relay", // 强制 relay 来测试 TURN
		});

		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				pc.close();
				resolve(false);
			}, 8000);

			pc.onicecandidate = (event) => {
				if (event.candidate) {
					const candidateStr = event.candidate.candidate || "";
					if (candidateStr.includes(" relay ")) {
						clearTimeout(timeout);
						pc.close();
						resolve(true);
					}
				}
			};

			pc.onicegatheringstatechange = () => {
				if (pc.iceGatheringState === "complete") {
					clearTimeout(timeout);
					pc.close();
					resolve(false);
				}
			};

			pc.oniceconnectionstatechange = () => {
				// 状态变化，无需日志
			};

			// 创建一个 offer 来触发 ICE 收集
			pc.createDataChannel("test");
			pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => {
				clearTimeout(timeout);
				pc.close();
				resolve(false);
			});
		});
	}

	// ----- 生成报告 -----

	getReport(): ConnectionReport {
		this.report.peerEvents = this.peerEventLog;
		this.report.iceCandidates = this.iceCandidates;
		this.report.errors = this.errors;
		this.report.warnings = this.warnings;
		return this.report;
	}

	/** 在 console 中打印诊断摘要 */
	printSummary() {
		if (!this.enabled) return;
		const report = this.getReport();
		console.group("🔍 连接诊断报告");
		console.log("时间:", report.timestamp);
		console.log("ICE服务器:", report.iceServers);
		console.log("信令模式:", report.usePrefixMode ? "前缀模式" : "端口模式");
		console.log("信令地址:", report.signalingHost);
		console.log("网络:", report.networkInfo);

		console.group("阶段耗时:");
		for (const stage of report.stages) {
			const icon = stage.success ? "✅" : "❌";
			console.log(`${icon} ${stage.stage}: ${stage.duration}ms${stage.error ? ` (${stage.error})` : ""}`);
		}
		console.groupEnd();

		if (report.errors.length > 0) {
			console.group("错误:");
			report.errors.forEach((e) => console.error(e));
			console.groupEnd();
		}

		if (report.warnings.length > 0) {
			console.group("警告:");
			report.warnings.forEach((w) => console.warn(w));
			console.groupEnd();
		}

		console.group("ICE候选:");
		report.iceCandidates.forEach((c) => {
			console.log(`  ${c.type} ${c.address}:${c.port} (${c.transport})`);
		});
		console.groupEnd();

		console.groupEnd();
	}

	/** 导出完整 JSON 报告 */
	exportReport(): string {
		return JSON.stringify(this.getReport(), null, 2);
	}
}

// 全局单例
export const connectionDiagnostics = new ConnectionDiagnostics();

// 挂载到 window 方便控制台调试
if (typeof window !== "undefined") {
	(window as any).__connectionDiagnostics = connectionDiagnostics;
}
