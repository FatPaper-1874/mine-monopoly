import { MapItem } from "../interfaces/bace";
import Vibrant from "node-vibrant";

export function randomColor() {
	const H = Math.random();
	const S = Math.random();
	const L = 0.5;
	let ret = [H, S, L];
	ret[1] = 0.7 + ret[1] * 0.2; // [0.7 - 0.9] 排除过灰颜色

	// 数据转化到小数点后两位
	ret = ret.map(function (item) {
		return parseFloat(item.toFixed(2));
	});

	let R, G, B;

	function hue2rgb(p: any, q: any, t: any) {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	}

	let Q = L < 0.5 ? L * (1 + S) : L + S - L * S;
	let P = 2 * L - Q;
	R = hue2rgb(P, Q, H + 1 / 3) * 255;
	G = hue2rgb(P, Q, H) * 255;
	B = hue2rgb(P, Q, H - 1 / 3) * 255;

	let hex = "#" + ((1 << 24) + (Math.round(R) << 16) + (Math.round(G) << 8) + Math.round(B)).toString(16).slice(1);

	return hex;
}

export function getRandomInteger(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getItemTypesFromMapItems(mapItems: MapItem[]) {
	const itemTypesIdSet = new Set<string>();
	mapItems.forEach((i) => {
		itemTypesIdSet.add(i.type.id);
	});
	return Array.from(itemTypesIdSet).map((typeId) => {
		return mapItems.find((mapItem) => mapItem.type.id === typeId)!.type;
	});
}

export function getPropertiesFromMapItems(mapItems: MapItem[]) {
	return mapItems.map((mapItem) => mapItem.property).filter((p) => p);
}

export function randomString(length: number) {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let randomString = "";
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		randomString += characters.charAt(randomIndex);
	}
	return randomString;
}

export async function getImageMainColor(filename: string) {
	try {
		const palette = await Vibrant.from(filename).getPalette();
		if (!palette || !palette.Vibrant) return null;
		const dominantColor = palette.Vibrant.getHex();
		return dominantColor;
	} catch (error) {
		console.error("Error:", error);
		return null;
	}
}

export function getFileNameInPath(filePath: string) {
	const tempArr = filePath.split("/");
	if (tempArr.length < 1) {
		return "";
	} else {
		return tempArr[tempArr.length - 1];
	}
}
