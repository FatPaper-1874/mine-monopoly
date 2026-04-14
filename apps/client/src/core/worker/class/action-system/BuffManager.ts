import { Buff, IBuffManager } from "@mine-monopoly/types";

export class BuffManager implements IBuffManager {
	private buffs = new Map<string, Buff>();

	public addBuff(buff: Buff): void {
		this.buffs.set(buff.id, { ...buff });
	}

	public updateBuff(id: string, fields: Partial<Buff>): boolean {
		const buff = this.buffs.get(id);
		if (!buff) return false;
		Object.assign(buff, fields);
		return true;
	}

	public removeBuff(id: string): boolean {
		return this.buffs.delete(id);
	}

	public removeByTag(tag: string): void {
		for (const [id, buff] of this.buffs) {
			if (buff.tags?.includes(tag)) {
				this.buffs.delete(id);
			}
		}
	}

	public hasBuffWithTag(tag: string): boolean {
		for (const buff of this.buffs.values()) {
			if (buff.tags?.includes(tag)) {
				return true;
			}
		}
		return false;
	}

	public getBuffs(): Buff[] {
		return Array.from(this.buffs.values());
	}

	public clear(): void {
		this.buffs.clear();
	}
}
