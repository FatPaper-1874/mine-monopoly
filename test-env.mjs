/**
 * Test script to verify .env file is being read correctly
 */

console.log("=== Testing @mine-monopoly/env package ===\n");

// Test 1: Check if process.env has values BEFORE importing @mine-monopoly/env
console.log("1. BEFORE import:");
console.log("   process.env.FATPAPER_DOMAIN:", process.env.FATPAPER_DOMAIN || "NOT SET");
console.log("   process.env.SERVER_PORT:", process.env.SERVER_PORT || "NOT SET");
console.log("   process.env.MYSQL_PORT:", process.env.MYSQL_PORT || "NOT SET");

// Test 2: Import and check env object
console.log("\n2. AFTER import:");
import { env, getServerConfig } from "./packages/env/dist/index.js";

try {
	const serverConfig = getServerConfig();
	console.log("   Server config loaded successfully!");
	console.log("   fatpaperDomain:", serverConfig.fatpaperDomain);
	console.log("   serverPort:", serverConfig.serverPort);
	console.log("   mysqlPort:", serverConfig.mysqlPort);
	console.log("   monopolyAdminPort:", serverConfig.monopolyAdminPort);

	// Test 3: Compare with .env values
	console.log("\n3. Verification:");
	const expectedValues = {
		fatpaperDomain: "localhost",
		serverPort: 81,
		mysqlPort: 3303,
		monopolyAdminPort: 5174,
		iceServerPort: 82,
	};

	let allMatch = true;
	for (const [key, expected] of Object.entries(expectedValues)) {
		const actual = serverConfig[key];
		const match = actual === expected;
		allMatch = allMatch && match;
		console.log(`   ${key}: ${actual} ${match ? "✓" : "✗ (expected: " + expected + ")"}`);
	}

	console.log("\n4. Result:", allMatch ? "SUCCESS ✅" : "FAILURE ❌");

	if (!allMatch) {
		console.log("\n⚠️  WARNING: .env file values don't match!");
		console.log("   This could mean:");
		console.log("   - .env file is not being loaded");
		console.log("   - Default values are being used instead");
		console.log("   - .env file has different values");
	}
} catch (error) {
	console.error("\n❌ Error loading server config:", error.message);
	process.exit(1);
}
