export type ExcludeStringKeys<T> = {
	[K in keyof T as T[K] extends string ? never : K]: T[K];
};

export type ExcludeFunctionKeys<T> = {
	[K in keyof T as T[K] extends Function ? never : K]: T[K];
};
