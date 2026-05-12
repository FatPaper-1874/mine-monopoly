const MAGIC = new Uint8Array([0x4d, 0x4d, 0x4d, 0x50]); // "MMMP"
const IV_LENGTH = 16;

function getKeyBytes(key: string): Uint8Array {
  if (!key) throw new Error("加密密钥未配置，请检查 MAP_ENCRYPT_KEY 环境变量");
  const bytes = new TextEncoder().encode(key);
  if (bytes.length !== 16) throw new Error(`AES key must be 16 bytes, got ${bytes.length}`);
  return bytes;
}

async function importKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", getKeyBytes(key) as BufferSource, { name: "AES-CBC" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(data: Uint8Array, key: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cryptoKey = await importKey(key);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, data as BufferSource);
  const result = new Uint8Array(4 + IV_LENGTH + encrypted.byteLength);
  result.set(MAGIC, 0);
  result.set(iv, 4);
  result.set(new Uint8Array(encrypted), 4 + IV_LENGTH);
  return result;
}

export function isProductFile(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x4d && data[1] === 0x4d && data[2] === 0x4d && data[3] === 0x50;
}

export async function decrypt(data: Uint8Array, key: string): Promise<Uint8Array> {
  if (!isProductFile(data)) throw new Error("Not a .mmmap file");
  const iv = data.slice(4, 4 + IV_LENGTH);
  const encrypted = data.slice(4 + IV_LENGTH);
  const cryptoKey = await importKey(key);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, encrypted as BufferSource);
    return new Uint8Array(decrypted);
  } catch {
    throw new Error("地图文件解密失败，可能是加密密钥不匹配");
  }
}