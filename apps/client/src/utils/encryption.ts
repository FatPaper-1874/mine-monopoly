import { getEncryptionKey } from "@src/utils/api/auth";

async function encryptWithKey(password: string, key: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		new Uint8Array(key.match(/.{1,2}/g)!.map(b => parseInt(b, 16))),
		{ name: "AES-GCM" },
		false,
		["encrypt"],
	);
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		cryptoKey,
		new TextEncoder().encode(password),
	);
	const result = new Uint8Array(iv.length + encrypted.byteLength);
	result.set(iv);
	result.set(new Uint8Array(encrypted), iv.length);
	return btoa(String.fromCharCode(...result));
}

export async function getEncryption(str: string) {
	let key = localStorage.getItem("encryption-key");
	if (!key) key = await getEncryptionKey();
	if (!key) return null;
	return encryptWithKey(str, key);
}
