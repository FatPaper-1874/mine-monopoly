const utils = {
	randomString: (length: number) => {
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let randomString = "";
		for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * characters.length);
			randomString += characters.charAt(randomIndex);
		}
		return randomString;
	},
	randomInRange: (min: number, max: number) => {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},
};
