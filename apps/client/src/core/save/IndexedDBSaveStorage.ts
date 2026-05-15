import { SaveRecord } from "./types";

const DB_NAME = "mine-monopoly-saves";
const DB_VERSION = 3;
const STORE_NAME = "saves";

export interface ISaveStorage {
	save(record: SaveRecord): Promise<void>;
	load(id: string): Promise<SaveRecord | null>;
	list(): Promise<SaveRecord[]>;
	listByMap(mapId: string, mapVersion: string): Promise<SaveRecord[]>;
	delete(id: string): Promise<void>;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
	if (dbInstance) return Promise.resolve(dbInstance);
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			let store: IDBObjectStore;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
			} else {
				store = request.transaction!.objectStore(STORE_NAME);
			}
			if (!store.indexNames.contains("mapId_version")) {
				store.createIndex("mapId_version", ["mapId", "mapVersion"], { unique: false });
			}
		};
		request.onsuccess = () => {
			dbInstance = request.result;
			resolve(request.result);
		};
		request.onerror = () => reject(request.error);
	});
}

export class IndexedDBSaveStorage implements ISaveStorage {
	async save(record: SaveRecord): Promise<void> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(record);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async load(id: string): Promise<SaveRecord | null> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result ?? null);
			request.onerror = () => reject(request.error);
		});
	}

	async list(): Promise<SaveRecord[]> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async listByMap(mapId: string, mapVersion: string): Promise<SaveRecord[]> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const index = store.index("mapId_version");
			const request = index.getAll([mapId, mapVersion]);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async delete(id: string): Promise<void> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}
}
