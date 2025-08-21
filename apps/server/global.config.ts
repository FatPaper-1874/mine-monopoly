import { FATPAPER_DOMAIN, USER_SERVER_PORT, ICE_SERVER_PORT, MONOPOLY_SERVER_PORT, PROTOCOL } from "../global.config";
import {
	__TC_SECRETID__ as tc_id,
	__TC_SECRETKEY__ as tc_key,
	__TC_BUCKET_NAME__ as tc_bn,
	__TC_REGION__ as tc_r,
} from "../tencent-cloud";

//容器内部通信所以不需要https
export const __USERSERVERHOST__ = `http://${
	process.env.NODE_ENV == "production" ? "user-server" : "localhost"
}:${USER_SERVER_PORT}`;

export const __MONOPOLYSERVERHOST__ = `${FATPAPER_DOMAIN}:${MONOPOLY_SERVER_PORT}`;

export const __APIPORT__ = MONOPOLY_SERVER_PORT;
export const __ICE_SERVER_PORT__ = ICE_SERVER_PORT;

export const __TC_ID__ = tc_id;
export const __TC_KEY__ = tc_key;

export const __TC_BUCKET_NAME__ = tc_bn;
export const __TC_REGION__ = tc_r;
