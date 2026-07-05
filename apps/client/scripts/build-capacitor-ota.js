/**
 * Capacitor OTA 构建脚本
 *
 *   1. vite build --mode capacitor → dist/frontend/
 *   2. 从 CHANGELOG.md 提取更新日志
 *   3. zip 压缩 dist/frontend/ → dist/capacitor/ota/dist.zip
 *   4. 生成 update.json
 *   5. 可选 --upload: 上传到 R2
 *
 * 使用: node scripts/build-capacitor-ota.js [--upload]
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url), __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist", "frontend");
const OTA = resolve(ROOT, "dist", "capacitor", "ota");
const ZIP = resolve(OTA, "dist.zip");
const UPDATE_JSON = resolve(OTA, "update.json");
const NATIVE_UPDATE_JSON = resolve(OTA, "native-update.json");
const DIST_URL = "https://assets.fatpaper.site/releases/client/download/apk/dist.zip";
const UPDATE_POLICY = resolve(ROOT, "build", "update-policy.json");

const args = process.argv.slice(2), shouldUpload = args.includes("--upload");

function versionToCode(version) {
	const [major = 0, minor = 0, patch = 0] = version
		.split("-")[0]
		.split(".")
		.map((part) => parseInt(part, 10) || 0);
	return major * 10000 + minor * 100 + patch;
}

// 1. vite build
console.log("[Capacitor OTA] vite build…");
execSync("npx vite build --mode capacitor", { cwd: ROOT, stdio: "inherit" });
if (!existsSync(DIST)) process.exit(1);

// 2. release notes
let notes = "修复了一些已知问题，优化了游戏体验。";
const cl = resolve(ROOT, "CHANGELOG.md");
if (existsSync(cl)) {
	const m = readFileSync(cl, "utf-8").match(/## \d+\.\d+\.\d+.*?\n([\s\S]*?)(?=## \d+\.\d+\.\d+|$)/);
	if (m?.[1]) notes = m[1].split("\n").filter(l => { const t = l.trim(); return t && !t.startsWith("### "); }).join("\n").trim();
}

// 3. zip
mkdirSync(OTA, { recursive: true });
if (process.platform === "win32") {
	execSync(`tar -a -c -f "${ZIP}" -C "${DIST}" .`, { stdio: "inherit" });
} else {
	execSync(`zip -r "${ZIP}" .`, { cwd: DIST, stdio: "inherit" });
}

// 4. update.json / native-update.json
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));
const updatePolicy = existsSync(UPDATE_POLICY)
	? JSON.parse(readFileSync(UPDATE_POLICY, "utf-8"))
	: {};
const nativeUpdateUrl = `https://assets.fatpaper.site/releases/client/download/apk/MineMonopoly-Android-${pkg.version}.apk`;
const versionCode = versionToCode(pkg.version);

writeFileSync(
	UPDATE_JSON,
	JSON.stringify(
		{
			version: pkg.version,
			url: DIST_URL,
			releaseNotes: notes,
			minNativeVersion: updatePolicy.minNativeVersion || "0.0.0",
		},
		null,
		2,
	) + "\n",
);
writeFileSync(
	NATIVE_UPDATE_JSON,
	JSON.stringify(
		{
			version: pkg.version,
			versionCode,
			url: nativeUpdateUrl,
			releaseNotes: notes,
		},
		null,
		2,
	) + "\n",
);
console.log(`[Capacitor OTA] ✅ dist.zip + update.json + native-update.json (v${pkg.version})`);

// 5. upload (optional)
if (shouldUpload) {
	const bk = process.env.R2_BUCKET_NAME, ep = process.env.R2_ENDPOINT_URL;
	const tgt = `s3://${bk}/releases/client/download/apk/`;
	for (const f of [ZIP, UPDATE_JSON, NATIVE_UPDATE_JSON]) {
		execSync(`aws s3 cp "${f}" "${tgt}" --endpoint-url "${ep}" --no-progress`, {
			stdio: "inherit",
			env: {
				...process.env,
				AWS_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
				AWS_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
				AWS_DEFAULT_REGION: "auto",
			},
		});
	}
	console.log(`[Capacitor OTA] ✅ uploaded to R2`);
}
