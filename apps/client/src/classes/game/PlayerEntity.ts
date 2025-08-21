import { GameEntity } from "@src/classes/game/GameEntity";
import { PlayerInfo } from "@src/interfaces/game";

export class PlayerEntity extends GameEntity {
	public playerInfo: PlayerInfo;
	private preStopNum: number = 0;

	constructor(size: number, baseUrl: string, fileNameWithoutType: string, playerInfo: PlayerInfo) {
		super(size, baseUrl, fileNameWithoutType);
		this.playerInfo = playerInfo;
	}

	public async doAnimation(name: string, loop: boolean = false) {
		//To do
		if (this.playerInfo.stop > 0) {
			await super.doAnimation("sleeping", loop);
		} else {
			await super.doAnimation(name, loop);
		}
	}

	public async load() {
		const s = await super.load();
		if (this.skeletonMesh) {
			this.skeletonMesh.userData = { id: this.playerInfo.id };
			s.userData = { id: this.playerInfo.id };
		}
		this.doAnimation("idle", true);
		return s;
	}

	public updatePlayerInfo(playerInfo: PlayerInfo) {
		this.playerInfo = playerInfo;
		this.currentPositionIndex = playerInfo.positionIndex;
		if (this.playerInfo.stop > 0) {
			super.doAnimation("sleeping", true);
		}
	}

	public update() {
		if (this.playerInfo.stop > 0) {
			super.doAnimation("sleeping", true);
		} else if (this.preStopNum != 0) {
			super.doAnimation("idle", true);
		}
		this.preStopNum = this.playerInfo.stop;
		super.update();
	}
}
