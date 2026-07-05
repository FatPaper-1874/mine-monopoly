import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeAppInfo = {
	versionName: string;
	versionCode: number;
	packageName: string;
};

type NativeUpdaterPlugin = {
	getAppInfo: () => Promise<NativeAppInfo>;
	downloadApk: (options: { url: string; version: string }) => Promise<void>;
	installDownloadedApk: () => Promise<void>;
	addListener: (eventName: string, callback: (data: any) => void) => Promise<{ remove: () => Promise<void> }>;
};

export const NativeUpdater = registerPlugin<NativeUpdaterPlugin>("NativeUpdater", {
	web: () => ({
		getAppInfo: async () => ({
			versionName: __APP_VERSION__,
			versionCode: 0,
			packageName: "web",
		}),
		downloadApk: async () => {},
		installDownloadedApk: async () => {},
		addListener: async () => ({ remove: async () => {} }),
	}),
});

export function hasNativeUpdaterPlugin(): boolean {
	return Capacitor.isPluginAvailable("NativeUpdater");
}
