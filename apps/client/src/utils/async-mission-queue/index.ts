export type EventSource<TYPE, DATA> = (
	callback: (data: DATA & { type: TYPE }) => void,
	cancle: (message: string) => void
) => Function;
export type MissionQueueItem<TYPE, DATA> = {
	type: TYPE;
	fn: (data: DATA & { type: TYPE }, cancle: (message: string) => void) => any | Promise<any>;
};

export async function asyncMission<TYPE, DATA>(
	eventSource: EventSource<TYPE, DATA>, // 通用的事件源处理器,
	handler: MissionQueueItem<TYPE, DATA>) {
	return new Promise<any>((resolve, reject) => {
		let cancleHandler: Function | null = null;
		const _handler = async (data: DATA & { type: TYPE }) => {
			if (data.type === handler.type) {
				try {
					resolve(await handler.fn(data, cancle));
				} catch (e: any) {
					cancle(e.message);
				}
			}

			cancleHandler && cancleHandler();
		};

		function cancle(e: string) {
			cancleHandler && cancleHandler();
			reject(e);
		}

// 订阅事件源，传入 handler 回调函数
		cancleHandler = eventSource(_handler, cancle);
	});
}

// 通用的异步消息队列处理函数
export async function asyncMissionQueue<TYPE, DATA>(
	eventSource: EventSource<TYPE, DATA>, // 通用的事件源处理器
	functionList: MissionQueueItem<TYPE, DATA>[]
): Promise<string> {
	return new Promise((resolve, reject) => {
		function* fnQueue() {
			while (functionList.length !== 0) {
				yield functionList.shift();
			}
		}

		const queueIterator = fnQueue();
		let queueResult = queueIterator.next();
		let currentFunctionObj = queueResult.value;
		let cancleHandler: Function | null = null;

		// 通用的事件处理器
		const handler = async (data: DATA & { type: TYPE }) => {
			if (!queueResult.done && currentFunctionObj) {
				if (data.type === currentFunctionObj.type) {
					try {
						await currentFunctionObj.fn(data, cancle);
					} catch (e: any) {
						cancle(e.message);
					}
					queueResult = queueIterator.next();
					currentFunctionObj = queueResult.value;
				}
			}

			// 如果所有函数都已执行完毕
			if (queueResult.done) {
				// 取消监听
				cancleHandler && cancleHandler();
				resolve("done");
			}
		};

		function cancle(e: string) {
			cancleHandler && cancleHandler();
			reject(e);
		}

		// 订阅事件源，传入 handler 回调函数
		cancleHandler = eventSource(handler, cancle);
	});
}