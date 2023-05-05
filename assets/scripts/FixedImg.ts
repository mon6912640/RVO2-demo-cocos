// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class FixedImg extends cc.Component {

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

    }

    // update (dt) {}
    public get fixedSize() {
        return this._fixedSize;
    }

    @property({ type: cc.Integer })
    public set fixedSize(value) {
        this._fixedSize = value;
        this.onSizeChanged();
    }

    @property({ type: cc.SpriteFrame })
    set spriteFrame(value: cc.SpriteFrame) {
        let t = this;
        let t_spriteCom = t.getComponent(cc.Sprite);
        if (t_spriteCom) {
            t_spriteCom.spriteFrame = value;
        }
    }

    /**固定尺寸 */
    private _fixedSize: number = 0;

    onLoad() {
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.onSizeChanged, this);
        this.onSizeChanged();
        // let t = this;
        // let t_width = t.getComponent(cc.Sprite)?.spriteFrame?.getTexture()?.width;
        // let t_height = t.getComponent(cc.Sprite)?.spriteFrame?.getTexture()?.height;
        // // console.log("t_width=" + t_width + ",t_height=" + t_height);
    }

    /**当尺寸变化时，重置node节点大小 */
    onSizeChanged() {
        // var width = this.node.width;
        // var height = this.node.height;
        // var max = Math.max(width, height);
        // this.node.scale = this._fixedSize / max;
    }
}
