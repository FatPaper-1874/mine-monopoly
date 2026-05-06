import { GameMap } from "@mine-monopoly/types";
import { loadFromProto, decodeProductMap } from "@mine-monopoly/utils";
import { isProductFile, decrypt } from "@mine-monopoly/utils/crypto";
import { env } from "@mine-monopoly/env";

export async function readMapFile(file: File) {
	const fileArrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(fileArrayBuffer);

	if (isProductFile(bytes)) {
		return readMmmapFile(bytes);
	}
	const res = await loadFromProto(bytes);
	return {
		id: res.id,
		mapData: JSON.parse(res.jsonData) as GameMap,
		models: res.modelFiles,
		images: res.imageFiles,
	};
}

async function readMmmapFile(bytes: Uint8Array) {
	const key = env("MAP_ENCRYPT_KEY", "");
	const decrypted = await decrypt(bytes, key);
	const productMap = decodeProductMap(decrypted);
	const mapData = JSON.parse(productMap.payload) as GameMap;

	const modelFiles = productMap.resources
		.filter((r) => r.ext === "glb" || r.ext === "gltf")
		.map((r) => ({ id: r.rid, name: r.label, filetype: r.ext, buffer: new Uint8Array(r.blob) }));

	const imageFiles = productMap.resources
		.filter((r) => r.ext !== "glb" && r.ext !== "gltf")
		.map((r) => ({ id: r.rid, name: r.label, filetype: r.ext, buffer: new Uint8Array(r.blob) }));

	return {
		id: productMap.mapId,
		mapData,
		models: modelFiles,
		images: imageFiles,
	};
}

export function uint8ArrayToObjectURL(uint8Array: Uint8Array, mimeType: string = "image/png"): string {
	const cleanBuffer = uint8Array.slice().buffer; // 保证是 ArrayBuffer
	const blob = new Blob([cleanBuffer], { type: mimeType });
	return URL.createObjectURL(blob);
}

export function uint8ArrayToFile(
	uint8Array: Uint8Array,
	fileName: string,
	mimeType: string = "image/png",
	lastModified: number = Date.now(),
): File {
	const cleanBuffer = uint8Array.slice().buffer; // 保证是 ArrayBuffer
	const blob = new Blob([cleanBuffer], { type: mimeType });
	return new File([blob], fileName, {
		type: mimeType,
		lastModified: lastModified,
	});
}

export function calculateFileHash(file: File, algorithm?: string): Promise<string>;
export function calculateFileHash(file: ArrayBuffer, algorithm?: string): Promise<string>;
export async function calculateFileHash(file: File | ArrayBuffer, algorithm = "SHA-256") {
	if (file instanceof File) {
		file = await file.arrayBuffer();
	}
	const hashBuffer = await crypto.subtle.digest(algorithm, file);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	return hashHex;
}
