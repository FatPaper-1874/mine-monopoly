import { env } from "@mine-monopoly/env";

// 基础环境变量
export const __USERSERVERHOST__ = `http://localhost:${env<number>("SERVER_PORT")}`;

export const __MONOPOLYSERVERHOST__ = `${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
export const __APIPORT__ = env<number>("SERVER_PORT");
export const __ICE_SERVER_PORT__ = env<number>("ICE_SERVER_PORT");
export const __MONOPOLYSERVER__ = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
export const __ICE_SERVER_PATH__ = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("ICE_SERVER_PORT")}`;
export const __FATPAPER_HOST__ = env("FATPAPER_DOMAIN");
export const __PROTOCOL__ = env("PROTOCOL");

// 腾讯云配置（可选）
export const __TC_ID__ = env("TC_ID", "");
export const __TC_KEY__ = env("TC_KEY", "");
export const __TC_BUCKET_NAME__ = env("TC_BUCKET_NAME", "");
export const __TC_REGION__ = env("TC_REGION", "");
