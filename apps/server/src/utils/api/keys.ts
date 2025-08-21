import axios from "axios";
import {__USERSERVERHOST__} from "../../../global.config";
import {serverLog} from "../logger";

let publicKey = "";

export async function getPublicKey() {
    const maxRetry = 10;
    const timeout = 5000;

    let _retryNum = 0;
    while (!publicKey && _retryNum < maxRetry) {
        try {
            publicKey = (await axios.get(`${__USERSERVERHOST__}/user/public-key`)).data.data;
        } catch (e: any) {
            serverLog(`向用户服务器请求公钥失败，错误信息：${e.message}`, "error");
            serverLog(`正在进行第${_retryNum + 1}次重试`, "warn");
            await new Promise((resolve, reject) => {
                setTimeout(resolve, timeout)
            });
            _retryNum++;
        }
    }
    if (_retryNum >= maxRetry) throw new Error("获取user服务器公钥失败");
    return publicKey;
}
