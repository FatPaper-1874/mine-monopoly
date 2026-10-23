// Run with the Electron executable: electron scripts/tests/ai-console.electron.cjs
const { app, BrowserWindow, ipcMain } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
app.disableHardwareAcceleration();
app.setPath("userData", path.join(os.tmpdir(), "monopoly-ai-console-test-" + process.pid));

const tail = "完整长内容的最后一句";
const longText = "完整输入与输出内容，不能被截断。".repeat(600) + tail;
const unsafe = '</pre><script>window.__usageInjected = true</script>';
const records = Array.from({ length: 36 }, (_, index) => ({
	id: "call-" + index, traceId: "decision-" + index, playerId: index % 2 ? "player-b" : "player-a",
	playerName: index % 2 ? "小红" : "小明", roleName: index % 2 ? "冒险家" : "商人",
	title: "购买地产 " + index, round: 3, status: "success", timestamp: Date.now() - index * 1000,
	provider: "openai-compatible", model: "test-model", durationMs: 20,
	promptChars: longText.length, responseChars: longText.length,
	inputTokens: 100, outputTokens: 20, totalTokens: 120, usageAvailable: true,
}));
const details = new Map(records.map(record => [record.id, {
	record,
	request: { url: "https://example.test/chat/completions", method: "POST", headers: { Authorization: "[已隐藏]" },
		body: JSON.stringify({ model: "test-model", temperature: 0.2, extraInputField: "完整输入字段", messages: [
			{ role: "system", content: "系统指令" }, { role: "user", content: longText + unsafe },
		] }) },
	response: { status: 200, statusText: "OK", headers: { "x-request-id": "provider-" + record.id },
		body: JSON.stringify({ choices: [{ message: { content: longText + unsafe } }], additionalOutputField: "完整输出字段", usage: { input_tokens: 100 } }) },
	modelOutput: longText + unsafe,
	selection: { optionId: "buy", reason: "保留实际采用结果" },
}]));
let consoleConfig = {
	mode: "remote",
	remote: { provider: "openai-compatible", model: "test-model", baseUrl: "https://example.test", apiKey: "test-key", timeoutMs: 90000 },
	remoteProfiles: [{ id: "slow", name: "慢模型", provider: "anthropic", model: "test-model", baseUrl: "https://example.test", apiKey: "test-key", timeoutMs: 180000 }],
};
let applyCount = 0;
let cleared = false;
let detailFetches = 0;
function snapshot() {
	const currentRecords = cleared ? [] : records;
	return {
		room: { mapName: "回归测试地图", canSyncRoomAI: true },
		config: consoleConfig,
		remoteUsage: { records: currentRecords, summary: { requestCount: currentRecords.length, inputTokens: 3600, outputTokens: 720, totalTokens: 4320 } },
		aiPlayers: ["player-a", "player-b"].map((userId, index) => ({
			userId, username: index ? "小红" : "小明", binding: { mode: "remote" }, isReady: true,
			usage: { records: currentRecords.filter(record => record.playerId === userId), summary: { totalTokens: 2160 } },
		})),
	};
}
ipcMain.handle("ai-console:get-state", snapshot);
ipcMain.handle("ai-console:apply-config", (event, config) => {
	applyCount++;
	consoleConfig = structuredClone(config);
	return { success: true, syncedRoomAI: true };
});
ipcMain.handle("ai-console:get-usage-detail", async (event, id) => {
	detailFetches++;
	if (id === "call-2") await new Promise(resolve => setTimeout(resolve, 80));
	return cleared ? null : details.get(id);
});
ipcMain.handle("ai-console:clear-usage", () => { cleared = true; return { success: true }; });

app.whenReady().then(async () => {
	const win = new BrowserWindow({ width: 1360, height: 820, show: false,
		webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false, offscreen: true } });
	const errors = [];
	win.webContents.on("console-message", (...args) => {
		const detail = args[1];
		if (detail && typeof detail === "object" && detail.level === "error") errors.push(detail.message);
	});
	const run = async code => { try { return await win.webContents.executeJavaScript(code); } catch (error) { console.error("Renderer script failed: " + code); throw error; } };
	async function until(code) {
		const deadline = Date.now() + 8000;
		while (Date.now() < deadline) {
			if (await run(code)) return;
			await new Promise(resolve => setTimeout(resolve, 30));
		}
		throw new Error("Timed out: " + code);
	}
	try {
		await win.loadFile(path.resolve(__dirname, "../../electron/ai-console.html"));
		await until('document.querySelectorAll("#usage-list [data-usage-id]").length === 36');
		assert.equal(await run('document.querySelectorAll("#player-detail-panel [data-usage-id]").length'), 18);
		assert.equal(detailFetches, 0, "Polling must not fetch full bodies");
		await run('require("electron").clipboard.writeText = value => { window.__copiedUsage = value; }; document.querySelector("#player-detail-panel [data-usage-id]").click();');
		await until('document.getElementById("usage-detail-content").textContent.includes("完整长内容的最后一句")');
		assert.equal(await run('document.getElementById("usage-detail-dialog").open'), true);
		assert.ok((await run('document.getElementById("usage-detail-title").textContent')).includes("小明 / 商人"));
		await run('document.querySelector("[data-usage-tab=request]").click();');
		const input = JSON.parse(await run('document.getElementById("usage-detail-content").textContent'));
		assert.equal(input.body.extraInputField, "完整输入字段");
		assert.ok(input.body.messages[1].content.endsWith(tail + unsafe));
		await run('document.querySelector("[data-usage-tab=response]").click();');
		const output = JSON.parse(await run('document.getElementById("usage-detail-content").textContent'));
		assert.equal(output.body.additionalOutputField, "完整输出字段");
		assert.equal(output.headers["x-request-id"], "provider-call-0");
		await run('document.querySelector("[data-usage-tab=selection]").click();');
		assert.equal(JSON.parse(await run('document.getElementById("usage-detail-content").textContent')).reason, "保留实际采用结果");
		await run('document.querySelector("[data-usage-tab=output]").click(); document.getElementById("usage-detail-copy").click();');
		const copied = JSON.parse(await run('window.__copiedUsage'));
		assert.equal(copied.modelOutput, longText + unsafe);
		assert.equal(copied.request.headers.Authorization, "[已隐藏]");
		assert.equal(await run('Boolean(window.__usageInjected)'), false, "Untrusted model content must stay plain text");
		const screenshot = path.join(os.tmpdir(), "monopoly-ai-usage-detail-" + process.pid + ".png");
		fs.writeFileSync(screenshot, (await win.webContents.capturePage()).toPNG());
		console.log("screenshot=" + screenshot);
		assert.equal(await run('(() => { const dialog = document.getElementById("usage-detail-dialog").getBoundingClientRect(); const copy = document.getElementById("usage-detail-copy").getBoundingClientRect(); return copy.bottom <= dialog.bottom; })()'), true);
		await run('document.getElementById("usage-detail-close").click();');
		await until('!document.getElementById("usage-detail-dialog").open');
		await run('document.querySelector("[data-player-id=player-b]").click(); document.querySelector("#player-detail-panel [data-usage-id]").click();');
		await until('document.getElementById("usage-detail-title").textContent.includes("小红 / 冒险家")');
		await run('openUsageDetail("call-2"); openUsageDetail("call-3");');
		await until('document.getElementById("usage-detail-title").textContent.includes("购买地产 3")');
		await new Promise(resolve => setTimeout(resolve, 120));
		assert.ok((await run('document.getElementById("usage-detail-title").textContent')).includes("购买地产 3"), "Late detail must not replace the current record");
		records[3].status = "pending";
		await run('refreshState({ silent: true });');
		await until('document.getElementById("usage-detail-meta").textContent.includes("等待响应")');
		await run('document.querySelector("[data-usage-tab=response]").click();');
		records[3].status = "error";
		records[3].error = "HTTP 500";
		details.get("call-3").response.body = "服务端错误的完整内容" + tail;
		await run('refreshState({ silent: true });');
		await until('document.getElementById("usage-detail-content").textContent.includes("服务端错误的完整内容")');
		assert.equal(await run('document.querySelector("[data-usage-tab=response]").getAttribute("aria-selected")'), "true");
		await run('document.getElementById("clear-usage-btn").click();');
		await until('!document.getElementById("usage-detail-dialog").open && document.querySelectorAll("[data-usage-id]").length === 0');
		assert.equal(await run('document.getElementById("global-timeout").value'), "90");
		assert.equal(await run('document.getElementById("profile-timeout").value'), "180");
		await run('document.getElementById("global-timeout").value = "125"; document.getElementById("global-timeout").dispatchEvent(new Event("input"));');
		consoleConfig.remote.timeoutMs = 95000;
		await run('refreshState({ silent: true });');
		assert.equal(await run('document.getElementById("global-timeout").value'), "125", "Polling must preserve unsaved timeout edits");
		await run('applyGlobalConfig();');
		assert.equal(consoleConfig.remote.timeoutMs, 125000);
		assert.equal(consoleConfig.remoteProfiles[0].timeoutMs, 180000);
		const beforeInvalid = applyCount;
		await run('document.getElementById("global-timeout").value = "0"; applyGlobalConfig();');
		assert.equal(applyCount, beforeInvalid, "Invalid timeouts must not be saved");
		await run('document.getElementById("global-timeout").value = "125"; document.getElementById("profile-timeout").value = "240"; document.getElementById("profile-timeout").dispatchEvent(new Event("input"));');
		await run('refreshState({ silent: true });');
		assert.equal(await run('document.getElementById("profile-timeout").value'), "240");
		await run('saveProfile();');
		assert.equal(consoleConfig.remoteProfiles[0].timeoutMs, 240000);
		assert.equal(consoleConfig.remote.timeoutMs, 125000);
		await run('addProfile();');
		assert.equal(consoleConfig.remoteProfiles[1].timeoutMs, 125000, "New profiles inherit the default timeout");
		assert.equal(await run('document.getElementById("profile-timeout").value'), "125");
		await run('closeUsageDetail(); document.getElementById("global-timeout").scrollIntoView({ block: "center" }); document.getElementById("profile-timeout").scrollIntoView({ block: "center" });');
		await new Promise(resolve => setTimeout(resolve, 150));
		const timeoutScreenshot = path.join(os.tmpdir(), "monopoly-ai-timeout-config-" + process.pid + ".png");
		fs.writeFileSync(timeoutScreenshot, (await win.webContents.capturePage()).toPNG());
		console.log("timeout-screenshot=" + timeoutScreenshot);
		assert.deepEqual(errors, []);
		console.log("AI console UI: all checks passed");
		win.destroy();
		app.exit(0);
	} catch (error) {
		console.error(error);
		win.destroy();
		app.exit(1);
	}
});
