import Agent from "../RVO/Agent";
import Simulator, { AgentCfg } from "../RVO/Simulator";
import Vector2 from "../RVO/Vector2";
import GameAgent from "./gameAgent";
import GameConfig from "./gameConfig";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameManager extends cc.Component {

    @property(cc.Prefab)
    public agentPrefab: cc.Prefab = null;
    @property(cc.Prefab)
    public agent1Prefab: cc.Prefab = null;
    @property(cc.Prefab)
    public agent2Prefab: cc.Prefab = null;
    @property(cc.Prefab)
    public obstaclePrefab: cc.Prefab = null;

    private _agentMap: { [sid: number]: GameAgent } = {};

    private _stepInterval: number = 0;

    private _agentCfg1: AgentCfg;
    private _agentCfg2: AgentCfg;
    private _defaultAgent: Agent;

    start() {
        this.node.on(cc.Node.EventType.MOUSE_DOWN, this.createObstacle, this);

        Simulator.Instance.setTimeStep(GameConfig.gameTimeStep);
        this._defaultAgent = Simulator.Instance.setAgentDefaults(
            GameConfig.neighborDist,
            GameConfig.maxNeighbors,
            GameConfig.timeHorizon,
            GameConfig.timeHorizonObst,
            GameConfig.radius,
            GameConfig.maxSpeed,
            GameConfig.velocity,
            GameConfig.mass,
        );

        this._agentCfg1 = new AgentCfg();
        this._agentCfg1.copyFromAgent(this._defaultAgent);
        this._agentCfg1.radius = 10;
        this._agentCfg1.neighborDist = this._agentCfg1.radius * 3;

        this._agentCfg2 = new AgentCfg();
        this._agentCfg2.copyFromAgent(this._defaultAgent);
        this._agentCfg2.radius = 40;
        this._agentCfg2.neighborDist = this._agentCfg2.radius * 3;
        this._agentCfg2.speedFactor = 4;
        this._agentCfg2.mass = 200;

        this.createAgents();
    }

    protected update(dt: number): void {
        Simulator.Instance.doStep();
    }

    private createAgents() {
        let center = cc.v2(0, 0);
        let agentNum = GameConfig.agentCount;
        let radius = 200;

        for (let i = 0; i < agentNum; i++) {
            let v2 = this.getPosInCircle(360 / agentNum * i, radius, center);
            //随机type为0或1
            let t_type = Math.floor(Math.random() * 3);
            // t_type = 0;
            let sid = this.createAgent(v2, t_type);
            if (sid > -1) {
                let ga = this._agentMap[sid];
                // ga.targetPos = this.getPosInCircle((360 / agentNum * i) - 180, radius, center);
                ga.targetPos = new Vector2(0, 0);
                let t_agentCfg = this.getAgentCfg(t_type);
                if (t_agentCfg) {
                    ga.speedFactor = t_agentCfg.speedFactor;
                }
            }
        }
    }

    private getAgentCfg(pType = 0) {
        let t = this;
        switch (pType) {
            case 1:
                return t._agentCfg1;
            case 2:
                return t._agentCfg2;
            default:
                return null;
        }
    }

    private createAgent(position: Vector2, pType = 0) {
        let t_prefab: cc.Prefab = null;
        let t_agentCfg: AgentCfg = this.getAgentCfg(pType);
        switch (pType) {
            case 1:
                t_prefab = this.agent1Prefab;
                break;
            case 2:
                t_prefab = this.agent2Prefab;
                break;
            default:
                t_prefab = this.agentPrefab;
                break;
        }
        if (!t_prefab) return -1;
        let sid = Simulator.Instance.addAgent(position, t_agentCfg);
        if (sid > -1) {
            let node = cc.instantiate(t_prefab);
            node.name = "agent_" + sid;
            this.node.parent.addChild(node);
            node.setPosition(position.x, position.y);

            let ga = node.getComponent(GameAgent) || node.addComponent(GameAgent);
            ga.sid = sid;

            this._agentMap[sid] = ga;
        }
        return sid;
    }

    private createObstacle(event: cc.Event.EventMouse) {
        if (!this.obstaclePrefab) return;
        let parent = this.node.parent;
        let node = cc.instantiate(this.obstaclePrefab);
        node.setPosition(parent.convertToNodeSpaceAR(event.getLocation()));
        parent.addChild(node);
    }

    /**
     * 求圆上某角度的点的坐标
     * @param angle 
     * @param radius 
     * @param center 
     * @returns 
     */
    private getPosInCircle(angle: number, radius: number, center: cc.Vec2) {
        let x = Math.floor(center.x + radius * Math.cos(angle * Math.PI / 180));
        let y = Math.floor(center.y + radius * Math.sin(angle * Math.PI / 180));

        return new Vector2(x, y);
    }

    /**科学计数法转换为10进制 */
    private transferToNumber(inputNumber) {
        if (isNaN(inputNumber)) {
            return inputNumber
        }
        inputNumber = '' + inputNumber
        inputNumber = parseFloat(inputNumber)
        let eformat = inputNumber.toExponential() // 转换为标准的科学计数法形式（字符串）
        let tmpArray = eformat.match(/\d(?:\.(\d*))?e([+-]\d+)/) // 分离出小数值和指数值
        let str: string = inputNumber.toFixed(Math.max(0, (tmpArray[1] || '').length - tmpArray[2]));
        return Number(str);
    }
}
