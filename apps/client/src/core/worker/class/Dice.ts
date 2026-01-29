import { DiceInfo, IDice } from "@mine-monopoly/types";
import { clone, result } from "lodash";

class Dice implements IDice {
	public id: string;
	public diceValues: number[] = [1, 2, 3, 4, 5, 6];
	public prophecy: number | undefined = undefined;

	constructor(diceValues?: number[]) {
		this.id = crypto.randomUUID();
		diceValues && this.setValues(diceValues);
	}

	public setProphecy(prophecy: number | undefined) {
		this.prophecy = prophecy;
	}

	public setValues(values: number[]): void {
		this.diceValues = clone(values);
	}

	public roll() {
		let r: number;
		let prophecy = undefined;
		// 预言
		if (this.prophecy) {
			r = this.prophecy;
			this.prophecy = undefined;
		} else {
			r = this.getRandomInteger();
		}
		return { diceValues: this.diceValues, result: r, prophecy };
	}

	private getRandomInteger() {
		return this.diceValues[Math.floor(Math.random() * this.diceValues.length)];
	}

	public getInfo(): DiceInfo {
		return {
			id: this.id,
			diceValues: this.diceValues,
			prophecy: this.prophecy,
		};
	}
}

export default Dice;
