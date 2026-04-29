import { env } from "@mine-monopoly/env";

// 基础环境变量
export const __PROTOCOL__ = env("PROTOCOL");
export const __FATPAPER_DOMAIN__ = env("FATPAPER_DOMAIN");
export const __SERVER_PORT__ = env<number>("SERVER_PORT");
export const __ICE_SERVER_PORT__ = env<number>("ICE_SERVER_PORT");
export const __MYSQL_PORT__ = env<number>("MYSQL_PORT");
export const __MYSQL_HOST__ = env("MYSQL_HOST");
export const __MYSQL_DATABASE__ = env("MYSQL_DATABASE");
export const __MYSQL_USERNAME__ = env("MYSQL_USERNAME");
export const __MYSQL_PASSWORD__ = env("MYSQL_PASSWORD");
export const __NODE_ENV__ = env("NODE_ENV");
export const __MONOPOLY_ADMIN_PORT__ = env<number>("MONOPOLY_ADMIN_PORT");

// 计算属性（从 env 包迁移到这里）
export const __USERSERVERHOST__ = `http://${
	env("NODE_ENV") === "production" ? "user-server" : "localhost"
}:${env<number>("SERVER_PORT")}`;

export const __MONOPOLYSERVERHOST__ = `${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
export const __APIPORT__ = env<number>("SERVER_PORT");
export const __MONOPOLYSERVER__ = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
export const __ICE_SERVER_PATH__ = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("ICE_SERVER_PORT")}`;
export const __FATPAPER_HOST__ = env("FATPAPER_DOMAIN");

// 腾讯云配置
export const __TC_ID__ = env("TC_ID", "");
export const __TC_KEY__ = env("TC_KEY", "");
export const __TC_BUCKET_NAME__ = env("TC_BUCKET_NAME", "");
export const __TC_REGION__ = env("TC_REGION", "");
