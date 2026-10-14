import {MapItem} from "@/interfaces/interfaces";

export function getItemTypesFromMapItems(mapItems: MapItem[]) {
    const itemTypesIdSet = new Set<string>();
    mapItems.forEach((i) => {
        itemTypesIdSet.add(i.type.id);
    });
    return Array.from(itemTypesIdSet).map((typeId) => {
        return mapItems.find((mapItem) => mapItem.type.id === typeId)!.type;
    });
}

export function arrayBufferToImgUrl(buffer: number[]): string {
    return (
        "data:image/png;base64," +
        window.btoa(new Uint8Array(buffer).reduce((res, byte) => res + String.fromCharCode(byte), ""))
    );
}

export function shuffleArray<T>(arr: T[]) {
    return arr.sort(function () {
        return 0.5 - Math.random();
    });
}

export function debounce(fn: Function, delay_ms: number) {
    let timer: NodeJS.Timeout;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn(...arguments);
        }, delay_ms);
    };
}

export function createLoginIframeOnBody(url: string): Promise<string> {
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.id = "login-iframe";
    document.body.appendChild(iframe);
    return new Promise((resolve, reject) => {
        window.addEventListener('message', e => {
            const token = e.data;
            document.body.removeChild(iframe);
            resolve(token);
        })
    })
}

export function isMobileDevice() {
	return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** 待审地图入队时间展示：存量数据可能没有入队时间，用统一文案兜底 */
export function formatSubmitTime(value?: Date | string | null, fallback = "历史数据（无入队时间）") {
	if (!value) return fallback;
	return new Date(value).toLocaleString();
}

/** 创作者展示：用户名（账号）；creatorName 可能为空（历史数据未绑定创作者） */
export function formatCreator(creatorName?: string | null, creatorAccount?: string | null) {
	if (!creatorName) return "未知创作者";
	return creatorAccount ? `${creatorName}（${creatorAccount}）` : creatorName;
}