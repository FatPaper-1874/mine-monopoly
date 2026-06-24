/**
 * GitService — 在 Electron main process 中使用 isomorphic-git + Node.js fs
 */
import * as git from "isomorphic-git";
import fs from "node:fs";
import path from "node:path";

const fsPromises = fs.promises;

// ─── 导出给 IPC handler 使用的接口 ───

export interface GitCommitInfo {
	oid: string;
	message: string;
	timestamp: number;
}

export interface GitDiffFile {
	filePath: string;
	status: "added" | "deleted" | "modified";
}

/**
 * 初始化 Git 仓库
 */
export async function gitInit(dir: string): Promise<void> {
	await git.init({ fs, dir });
}

/**
 * 暂存所有文件并提交
 */
export async function gitCommitAll(
	dir: string,
	message: string,
	authorName?: string,
): Promise<string> {
	// 先处理已删除的文件（git.add 不会自动暂存删除）
	const status = await git.statusMatrix({ fs, dir });
	for (const [filepath, , workdir] of status) {
		if (workdir === 0) {
			// 文件在工作区已删除
			try { await git.remove({ fs, dir, filepath }); } catch { /* ignore */ }
		}
	}

	// 暂存所有变更
	await git.add({ fs, dir, filepath: "." });

	// 提交
	const sha = await git.commit({
		fs,
		dir,
		message,
		author: {
			name: authorName || "Map Editor",
			email: "editor@mine-monopoly.local",
		},
	});

	return sha;
}

/**
 * 获取提交历史
 */
export async function gitLog(dir: string, depth: number = 50): Promise<GitCommitInfo[]> {
	const commits = await git.log({ fs, dir, depth });

	return commits.map((c) => ({
		oid: c.oid,
		message: c.commit.message,
		timestamp: c.commit.committer.timestamp * 1000,
	}));
}

/**
 * 将工作区恢复到指定提交
 */
export async function gitCheckout(dir: string, oid: string): Promise<void> {
	// 先清空工作区变更
	await git.checkout({
		fs,
		dir,
		ref: oid,
		force: true,
	});
}

/**
 * 比较两个提交之间的差异（文件列表）
 */
export async function gitDiff(
	dir: string,
	oidA: string,
	oidB: string,
): Promise<GitDiffFile[]> {
	// 用 walk 获取两个提交的文件树，然后比较
	const [filesA, filesB] = await Promise.all([
		listTreeFiles(dir, oidA),
		listTreeFiles(dir, oidB),
	]);

	const allPaths = new Set([...Object.keys(filesA), ...Object.keys(filesB)]);
	const diffs: GitDiffFile[] = [];

	for (const filePath of allPaths) {
		const a = filesA[filePath];
		const b = filesB[filePath];
		if (!a && b) {
			diffs.push({ filePath, status: "added" });
		} else if (a && !b) {
			diffs.push({ filePath, status: "deleted" });
		} else if (a && b && a !== b) {
			diffs.push({ filePath, status: "modified" });
		}
	}

	return diffs;
}

/**
 * 获取指定提交中某个文件的内容
 */
export async function gitReadFile(dir: string, oid: string, filePath: string): Promise<string> {
	const { blob } = await git.readBlob({
		fs,
		dir,
		oid,
		filepath: filePath,
	});
	return Buffer.from(blob).toString("utf-8");
}

/**
 * 获取当前 HEAD 的 oid
 */
export async function gitCurrentOid(dir: string): Promise<string | null> {
	try {
		const oid = await git.resolveRef({ fs, dir, ref: "HEAD" });
		return oid;
	} catch {
		return null;
	}
}

/**
 * 检查工作区是否有未提交的变更
 */
export async function gitHasChanges(dir: string): Promise<boolean> {
	const status = await git.statusMatrix({ fs, dir });
	// statusMatrix 返回 [filepath, HEAD_status, workdir_status, stage_status][]
	// 如果有任何文件不是 1,1,1（未修改），则存在变更
	return status.some(
		([, head, workdir, stage]) => head !== 1 || workdir !== 1 || stage !== 1,
	);
}

/**
 * 创建 tag
 */
export async function gitCreateTag(dir: string, name: string, _message?: string): Promise<void> {
	await git.tag({
		fs,
		dir,
		ref: name,
	});
}

// ─── 内部 ───

async function listTreeFiles(
	dir: string,
	oid: string,
): Promise<Record<string, string>> {
	const result: Record<string, string> = {};

	try {
		const treeResult = await git.readTree({ fs, dir, oid });
		const tree = treeResult.tree;

		for (const entry of tree) {
			if (entry.type === "blob") {
				result[entry.path] = entry.oid;
			}
			// 对于 subtree，递归读取
			if (entry.type === "tree") {
				const subFiles = await listTreeFiles(dir, entry.oid);
				for (const [subPath, subOid] of Object.entries(subFiles)) {
					result[`${entry.path}/${subPath}`] = subOid;
				}
			}
		}
	} catch {
		// 空提交等情况
	}

	return result;
}
