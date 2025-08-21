// import { RedisClientType, createClient } from "redis";
//
// const redisClient = createClient({ url: `redis://localhost:6379` });
//
// export async function redisClientInit() {
// 	await redisClient.connect();
// 	redisClient.on("error", (e) => {
// 		throw new Error(e.message);
// 	});
// }
//
// export async function setRedis(key: string, value: string, expire: number) {
// 	redisClient.set(key, value);
// 	redisClient.expire(key, expire);
// }
//
// export async function getRedis(key: string) {
// 	return redisClient.get(key);
// }
