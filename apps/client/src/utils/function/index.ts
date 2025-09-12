interface AsyncFunctionConstructor {
	new (...args: string[]): AsyncFunction;
	(...args: string[]): AsyncFunction;
	readonly prototype: AsyncFunction;
}

interface AsyncFunction extends Function {
	(...args: any[]): Promise<any>;
}

export function createAsyncFunction(...args: string[]) {
	//TODO 代码检查
	const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as AsyncFunctionConstructor;
	return new AsyncFunction(...args);
}
