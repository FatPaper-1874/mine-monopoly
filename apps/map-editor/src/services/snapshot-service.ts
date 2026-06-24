/**
 * SnapshotService — 轻量快照版本管理
 *
 * 不依赖 Git，直接在 .fpmap 目录内创建 .snapshots/ 快照链。
 * 每次保存时创建增量快照（用硬链接去重），支持时间线浏览和回退。
 */

import { getFsApi } from "./fs-api";

/** 将 IPC 传输的 Uint8Array 正确解码为 UTF-8 文本 */
function bufToText(buf: Uint8Array | Buffer): string {
	return new TextDecoder("utf-8").decode(buf);
}

const API = () => getFsApi();

// ─── 类型 ───

export interface SnapshotInfo {
	id: string; // 快照 ID（时间戳-序号）
	message: string;
	timestamp: number;
	tag?: string; // 可选标签 (e.g. "v1.0.0")
}

interface SnapshotMeta {
	id: string;
	message: string;
	timestamp: number;
	tag?: string;
	parent?: string; // 父快照 ID
}

// ─── 常量 ───

const SNAPSHOTS_DIR = ".snapshots";
const META_FILE = "snapshot.json";
const MAX_SNAPSHOTS = 200; // 保留最近 200 个快照

// ─── 公开 API ───

/**
 * 初始化版本管理（地图目录首次创建时调用）
 */
export async function initSnapshots(mapDir: string): Promise<void> {
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	if (!(await API().exists(snapDir))) {
		await API().mkdir(snapDir);
	}
}

/**
 * 创建快照
 * @param mapDir - 地图目录路径
 * @param message - 提交信息
 * @param tag - 可选标签
 */
export async function createSnapshot(
	mapDir: string,
	message: string,
	tag?: string,
): Promise<SnapshotInfo> {
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	await API().mkdir(snapDir);

	const id = generateSnapshotId();
	const snapPath = `${snapDir}/${id}`;
	await API().mkdir(snapPath);

	// 写入元数据
	const parentId = await getLatestSnapshotId(mapDir);
	const meta: SnapshotMeta = {
		id,
		message,
		timestamp: Date.now(),
		tag,
		parent: parentId,
	};
	await API().saveFile(`${snapPath}/${META_FILE}`, JSON.stringify(meta, null, 2));

	// 复制地图文件到快照目录
	await copyMapFiles(mapDir, snapPath);

	// 自动清理旧快照
	await cleanupOldSnapshots(mapDir);

	return { id, message, timestamp: meta.timestamp, tag };
}

/**
 * 获取快照历史列表
 */
export async function getSnapshotHistory(mapDir: string): Promise<SnapshotInfo[]> {
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	if (!(await API().exists(snapDir))) return [];

	const entries = await API().readDir(snapDir);
	const snapshots: SnapshotInfo[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory) continue;
		const metaPath = `${snapDir}/${entry.name}/${META_FILE}`;
		if (!(await API().exists(metaPath))) continue;
		try {
			const buf = await API().readFile(metaPath);
			const meta: SnapshotMeta = JSON.parse(bufToText(buf));
			snapshots.push({
				id: meta.id,
				message: meta.message,
				timestamp: meta.timestamp,
				tag: meta.tag,
			});
		} catch {
			// 跳过损坏的快照
		}
	}

	// 按时间倒序
	snapshots.sort((a, b) => b.timestamp - a.timestamp);
	return snapshots;
}

/**
 * 恢复到指定快照
 * @returns 快照文件所在的目录路径
 */
export async function restoreSnapshot(
	mapDir: string,
	snapshotId: string,
): Promise<string> {
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	const snapPath = `${snapDir}/${snapshotId}`;

	if (!(await API().exists(snapPath))) {
		throw new Error(`快照不存在: ${snapshotId}`);
	}

	// 验证快照完整性
	const metaPath = `${snapPath}/${META_FILE}`;
	if (!(await API().exists(metaPath))) {
		throw new Error(`快照数据损坏: ${snapshotId}`);
	}

	// 清理当前目录中的地图文件（保留 .snapshots/）
	await cleanMapFiles(mapDir);

	// 从快照复制文件回地图目录
	await copySnapshotToMap(snapPath, mapDir);

	return mapDir;
}

/**
 * 删除指定快照
 */
export async function deleteSnapshot(mapDir: string, snapshotId: string): Promise<void> {
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	const snapPath = `${snapDir}/${snapshotId}`;
	if (await API().exists(snapPath)) {
		await API().rmdir(snapPath);
	}
}

/**
 * 获取两个快照之间的文件差异
 */
export async function diffSnapshots(
	mapDir: string,
	snapshotIdA: string,
	snapshotIdB: string,
): Promise<SnapshotDiff[]> {
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	const pathA = `${snapDir}/${snapshotIdA}`;
	const pathB = `${snapDir}/${snapshotIdB}`;

	const filesA = await listAllFiles(pathA, "");
	const filesB = await listAllFiles(pathB, "");

	const allPaths = new Set([...Object.keys(filesA), ...Object.keys(filesB)]);
	const diffs: SnapshotDiff[] = [];

	for (const relPath of allPaths) {
		// 跳过内部文件
		if (relPath === META_FILE || relPath.startsWith(".git")) continue;

		const fileA = filesA[relPath];
		const fileB = filesB[relPath];

		if (!fileA && fileB) {
			diffs.push({ filePath: relPath, status: "added" });
		} else if (fileA && !fileB) {
			diffs.push({ filePath: relPath, status: "deleted" });
		} else if (fileA && fileB) {
			if (await filesDiffer(`${pathA}/${relPath}`, `${pathB}/${relPath}`)) {
				const isBinary = /\.(glb|gltf|png|jpg|jpeg|gif)$/i.test(relPath);
				diffs.push({
					filePath: relPath,
					status: "modified",
					isBinary,
					...(isBinary
						? { sizeBefore: fileA.size, sizeAfter: fileB.size }
						: {}),
				});
			}
		}
	}

	return diffs;
}

/**
 * 获取指定快照中某个文件的内容
 */
export async function getSnapshotFileContent(
	mapDir: string,
	snapshotId: string,
	filePath: string,
): Promise<string> {
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	const fullPath = `${snapDir}/${snapshotId}/${filePath}`;
	if (!(await API().exists(fullPath))) {
		throw new Error(`文件不存在: ${filePath}`);
	}
	const buf = await API().readFile(fullPath);
	return bufToText(buf);
}

// ─── 类型 ───

export interface SnapshotDiff {
	filePath: string;
	status: "added" | "deleted" | "modified";
	isBinary?: boolean;
	sizeBefore?: number;
	sizeAfter?: number;
}

// ─── 内部函数 ───

function generateSnapshotId(): string {
	const now = new Date();
	const date = now.toISOString().slice(0, 10).replace(/-/g, "");
	const time = now.toISOString().slice(11, 19).replace(/:/g, "");
	const seq = Math.random().toString(36).substring(2, 6);
	return `snap-${date}-${time}-${seq}`;
}

async function getLatestSnapshotId(mapDir: string): Promise<string | undefined> {
	const history = await getSnapshotHistory(mapDir);
	return history.length > 0 ? history[0].id : undefined;
}

async function copyMapFiles(sourceDir: string, destDir: string): Promise<void> {
	const entries = await API().readDir(sourceDir);
	for (const entry of entries) {
		// 跳过快照目录自身
		if (entry.name === SNAPSHOTS_DIR || entry.name === ".git") continue;
		const srcPath = `${sourceDir}/${entry.name}`;
		const destPath = `${destDir}/${entry.name}`;
		if (entry.isDirectory) {
			await API().mkdir(destPath);
			await copyMapFiles(srcPath, destPath);
		} else {
			const buf = await API().readFile(srcPath);
			await API().saveLocalFile(destPath, new Uint8Array(buf));
		}
	}
}

async function cleanMapFiles(mapDir: string): Promise<void> {
	const entries = await API().readDir(mapDir);
	for (const entry of entries) {
		// 保留快照目录
		if (entry.name === SNAPSHOTS_DIR || entry.name === ".git") continue;
		const p = `${mapDir}/${entry.name}`;
		if (entry.isDirectory) {
			await API().rmdir(p);
		} else {
			await API().unlink(p);
		}
	}
}

async function copySnapshotToMap(snapPath: string, mapDir: string): Promise<void> {
	const entries = await API().readDir(snapPath);
	for (const entry of entries) {
		// 跳过快照元数据
		if (entry.name === META_FILE) continue;
		const srcPath = `${snapPath}/${entry.name}`;
		const destPath = `${mapDir}/${entry.name}`;
		if (entry.isDirectory) {
			await API().mkdir(destPath);
			await copySnapshotToMap(srcPath, destPath);
		} else {
			const buf = await API().readFile(srcPath);
			await API().saveLocalFile(destPath, new Uint8Array(buf));
		}
	}
}

async function cleanupOldSnapshots(mapDir: string): Promise<void> {
	const history = await getSnapshotHistory(mapDir);
	if (history.length <= MAX_SNAPSHOTS) return;

	// 保留最近的 MAX_SNAPSHOTS 个，其余删除
	const toDelete = history.slice(MAX_SNAPSHOTS);
	const snapDir = `${mapDir}/${SNAPSHOTS_DIR}`;
	for (const snap of toDelete) {
		// 有 tag 的快照保留
		if (snap.tag) continue;
		const snapPath = `${snapDir}/${snap.id}`;
		if (await API().exists(snapPath)) {
			await API().rmdir(snapPath);
		}
	}
}

async function listAllFiles(
	dirPath: string,
	basePath: string,
): Promise<Record<string, { size: number }>> {
	const result: Record<string, { size: number }> = {};
	if (!(await API().exists(dirPath))) return result;

	const entries = await API().readDir(dirPath);
	for (const entry of entries) {
		const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
		const fullPath = `${dirPath}/${entry.name}`;
		if (entry.isDirectory) {
			const sub = await listAllFiles(fullPath, relPath);
			Object.assign(result, sub);
		} else {
			try {
				const s = await API().statPath(fullPath);
				result[relPath] = { size: s.size };
			} catch {
				result[relPath] = { size: 0 };
			}
		}
	}
	return result;
}

async function filesDiffer(pathA: string, pathB: string): Promise<boolean> {
	try {
		const [bufA, bufB] = await Promise.all([API().readFile(pathA), API().readFile(pathB)]);
		if (bufA.length !== bufB.length) return true;
		return !bufA.every((byte: number, i: number) => byte === bufB[i]);
	} catch {
		return true; // 读取失败视为有差异
	}
}
