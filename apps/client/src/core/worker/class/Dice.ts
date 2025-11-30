import { DiceInfo, IDice } from "@fatpaper-monopoly/types";

class Dice implements IDice {
	public min: number = 1;
	public max: number = 6;
	public diceProphecyQueue: number[] = [];

	public addDiceprophecy(prophecy: number) {
		this.diceProphecyQueue.push(prophecy);
	}

	public roll() {
		let r: number;
		// 预言
		if (this.diceProphecyQueue.length > 0) {
			r = this.diceProphecyQueue.shift() as number;
		} else {
			r = this.getRandomInteger(1, 6);
		}
		// 纠正
		r = Math.max(r, this.min);
		r = Math.min(r, this.max);
		return r;
	}

	private getRandomInteger(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	public getInfo(): DiceInfo {
		return {
			min: this.min,
			max: this.max,
			diceProphecyQueue: this.diceProphecyQueue,
		};
	}
}

export default Dice;
