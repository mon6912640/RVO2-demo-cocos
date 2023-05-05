import RVOMath from "../RVO/RVOMath";
import Simulator from "../RVO/Simulator";
import Vector2 from "../RVO/Vector2";
import GameConfig from "./gameConfig";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameAgent extends cc.Component {
    private _sid: number = -1;
    public set sid(val: number) {
        this._sid = val;
        this._sidLab.string = val + "";
    }
    public targetSid: number = -1;
    public targetPos: Vector2;

    private _sidLab: cc.Label;

    onLoad() {
        this._sidLab = this.node.getChildByName("sid").getComponent(cc.Label);
    }

    update(dt) {
        if (this._sid > -1) {
            let pos: Vector2 = Simulator.Instance.getAgentPosition(this._sid);
            let vel: Vector2 = Simulator.Instance.getAgentPrefVelocity(this._sid);

            if (!Number.isNaN(pos.x) && !Number.isNaN(pos.y)) {
                this.node.setPosition(pos.x, pos.y);
            } else {
                console.log(`sid=${this._sid}的对象PosX=${pos.x},PosY=${pos.y}`);
            }
        }
        this.updatePrefVelocity();
    }

    public updatePrefVelocity() {
        if (this.targetPos != null) {
            let curPos = Simulator.Instance.getAgentPosition(this._sid);
            let targetPos = this.targetPos;

            let goalVector = Vector2.subtract(targetPos, curPos);
            if (RVOMath.absSq(goalVector) > 1) {
                goalVector = RVOMath.normalize(goalVector);
            }
            Simulator.Instance.setAgentPrefVelocity(this._sid, goalVector);

            //由于完美对称，稍微扰动一下以避免死锁,但是不注释坐标始终会有变化
            // let angle = Math.random() * 2.0 * Math.PI;
            // let dist = Math.random() * 0.1;
            // Simulator.Instance.setAgentPrefVelocity(this._sid, Vector2.addition(Simulator.Instance.getAgentPrefVelocity(this._sid),
            //     Vector2.multiply2(dist, new Vector2(Math.cos(angle), Math.sin(angle)))));
        }
    }
}
