import { Animated2DBase } from "@src/classes/game/Animated2DBase";

export class RoleModel extends Animated2DBase {
	constructor(size: number, baseUrl: string, roleName: string) {
		super(size, baseUrl, roleName);
	}

	public async doAnimation(animation: string, loop: boolean = false) {
		//改变动画
		super.doAnimation(animation, loop);
		if (!loop) {
			//等待动画完成
			await super.waitNextAnimationComplete();
			//改变动画回到初始"idel"状态
			super.chanceAnimation("idle", true);
		}
	}
}
