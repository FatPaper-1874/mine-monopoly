import {
	FATPAPER_DOMAIN,
	ICE_SERVER_PORT,
	PROTOCOL,
	SERVER_PORT,
} from "@fatpaper-monopoly/config";

export const __PROTOCOL__ = PROTOCOL;
export const __MONOPOLYSERVER__ = `${PROTOCOL}://${FATPAPER_DOMAIN}:${SERVER_PORT}`;
export const __ICE_SERVER_PATH__ = `${PROTOCOL}://${FATPAPER_DOMAIN}:${ICE_SERVER_PORT}`;

export const __FATPAPER_HOST__ = FATPAPER_DOMAIN;
export const __ICE_SERVER_PORT__ = ICE_SERVER_PORT;
