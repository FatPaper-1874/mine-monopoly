class Dice {
	private diceNum = 2; //骰子个数(默认两个)
	private resultArray: Array<number> = [];

	constructor(diceNum: number) {
		this.diceNum = diceNum;
	}

	public getResultNumber() {
		return this.resultArray.reduce((p, c) => p + c, 0);
	}

	public getResultArray() {
		return this.resultArray;
	}

	public roll() {
		this.resultArray = [];
		for (let rollCount = 0; rollCount < this.diceNum; rollCount++) {
			this.resultArray[rollCount] = this.getRandomInteger(1, 6);
		}
	}

	private getRandomInteger(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}

export default Dice;
