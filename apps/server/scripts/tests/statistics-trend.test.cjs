const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const routerPath = path.resolve(__dirname, "../../src/routers/statistics-router.ts");
const compiled = ts.transpileModule(fs.readFileSync(routerPath, "utf8"), {
	fileName: routerPath,
	compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function createHarness(now, rows) {
	const routes = new Map();
	class User {}
	class GameRecord {}
	class FixedDate extends Date {
		constructor(...args) {
			super(...(args.length ? args : [now]));
		}
	}
	const repository = {
		count: async () => 10,
		createQueryBuilder() {
			let selected;
			const query = {
				select(expression, alias) { selected = { expression, alias }; return query; },
				addSelect() { return query; },
				where() { return query; },
				groupBy() { return query; },
				addGroupBy() { return query; },
				orderBy() { return query; },
				limit() { return query; },
				getCount: async () => 2,
				getRawOne: async () => ({ avgDuration: "60000" }),
				getRawMany: async () => selected?.alias === "date"
					? rows.map(row => ({
						// mysql2 returns SQL DATE as Date, but formatted text as a string.
						date: /^DATE_FORMAT\(/i.test(selected.expression)
							? row.date : new Date(row.date + "T00:00:00"),
						count: row.count,
					}))
					: [],
			};
			return query;
		},
	};
	const dependencies = {
		express: { Router: () => ({ get: (route, handler) => routes.set(route, handler) }) },
		"#src/db/dbConnecter": { AppDataSource: { getRepository: () => repository } },
		"#src/db/entities/User": { User },
		"#src/db/entities/GameRecord": { GameRecord },
	};
	const module = { exports: {} };
	vm.runInNewContext(compiled, {
		module, exports: module.exports, Date: FixedDate,
		require(name) {
			assert.ok(name in dependencies, "Unexpected dependency: " + name);
			return dependencies[name];
		},
	}, { filename: routerPath });
	return async route => {
		let response;
		await routes.get(route)({}, { json: value => { response = value; } });
		return JSON.parse(JSON.stringify(response));
	};
}

const scenarios = [
	{ now: "2026-10-23T12:00:00", start: "2026-10-17", end: "2026-10-23" },
	{ now: "2026-01-03T12:00:00", start: "2025-12-28", end: "2026-01-03" },
	{ now: "2026-03-10T12:00:00", start: "2026-03-04", end: "2026-03-10" },
	{ now: "2026-11-03T12:00:00", start: "2026-10-28", end: "2026-11-03" },
	{ now: "2024-03-02T12:00:00", start: "2024-02-25", end: "2024-03-02" },
];

for (const timezone of ["Asia/Shanghai", "UTC", "America/Los_Angeles"]) {
	for (const scenario of scenarios) {
		test(timezone + ": both trends preserve counts and calendar dates on " + scenario.end, async () => {
			const previousTimezone = process.env.TZ;
			try {
				process.env.TZ = timezone;
				const request = createHarness(scenario.now, [
					{ date: scenario.start, count: "3" },
					{ date: scenario.end, count: "5" },
				]);
				for (const route of ["/users", "/games"]) {
					const { status, data } = await request(route);
					assert.equal(status, 200);
					assert.equal(data.trend.length, 7);
					assert.deepEqual(data.trend[0], { date: scenario.start, count: 3 });
					assert.deepEqual(data.trend[6], { date: scenario.end, count: 5 });
					assert.ok(data.trend.slice(1, 6).every(point => point.count === 0));
					for (let i = 1; i < 7; i++) {
						const previous = Date.parse(data.trend[i - 1].date);
						assert.equal(Date.parse(data.trend[i].date) - previous, 86400000);
					}
				}
			} finally {
				if (previousTimezone === undefined) delete process.env.TZ;
				else process.env.TZ = previousTimezone;
			}
		});
	}
}

test("both trends return seven zero-count days when there are no records", async () => {
	const request = createHarness("2026-10-23T12:00:00", []);
	for (const route of ["/users", "/games"]) {
		const { data } = await request(route);
		assert.equal(data.trend.length, 7);
		assert.ok(data.trend.every(point => point.count === 0));
	}
});