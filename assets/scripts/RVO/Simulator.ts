import { SMap } from "../common/SMap";
import Agent from "./Agent";
import KdTree from "./KdTree";
import Obstacle from "./Obstacle";
import RVOMath from "./RVOMath";
import Vector2 from "./Vector2";


export default class Simulator {
    private static _instance: Simulator;
    public static get Instance() {
        if (!Simulator._instance) {
            Simulator._instance = new Simulator();
        }
        return Simulator._instance;
    }

    public static s_totalID = 0;

    agentMap = new SMap<number, Agent>();

    public obstacles_: Array<Obstacle> = [];
    public kdTree_: KdTree;
    public timeStep_: number;

    private defaultAgent_: Agent;
    private globalTime_: number;

    private _change = false;

    constructor() {
        this.init();
    }

    private init() {
        this.defaultAgent_ = null;
        this.kdTree_ = new KdTree();
        this.obstacles_ = [];
        this.globalTime_ = 0;
        this.timeStep_ = 0.1;
    }

    clear() {
        let t = this;
        t.agentMap.clear();
        t._change = false;
        t.kdTree_ = new KdTree();
        t.obstacles_.length = 0;
        t.globalTime_ = 0;
        t.timeStep_ = 0.1;
    }

    public doStep() {
        let t = this;
        let t_change = false;
        if (t._change) {
            t._change = false;
            t_change = true;
        }

        t.kdTree_.buildAgentTree(t_change);

        let t_agents = t.agentMap.values();

        for (let i = 0, j = t_agents.length; i < j; i++) {
            let agent = t_agents[i];
            agent.computeNeighbors();
            agent.computeNewVelocity();
        }

        for (let i = 0, j = t_agents.length; i < j; i++) {
            let agent = t_agents[i];
            agent.update();
        }

        t.globalTime_ += t.timeStep_;
        return t.globalTime_;
    }

    public addAgent(position: Vector2, pCfg: AgentCfg = null) {
        if (this.defaultAgent_ == null)
            return -1;
        let agent = new Agent();
        agent.id_ = Simulator.s_totalID;
        Simulator.s_totalID++;
        if (pCfg) {
            agent.maxNeighbors_ = pCfg.maxNeighbors;
            agent.maxSpeed_ = pCfg.maxSpeed;
            agent.neighborDist_ = pCfg.neighborDist;
            agent.position_ = position;
            agent.radius_ = pCfg.radius;
            agent.timeHorizon_ = pCfg.timeHorizon;
            agent.timeHorizonObst_ = pCfg.timeHorizonObst;
            agent.velocity_ = pCfg.velocity;
            agent.mass_ = pCfg.mass;
        }
        else {
            agent.maxNeighbors_ = this.defaultAgent_.maxNeighbors_;
            agent.maxSpeed_ = this.defaultAgent_.maxSpeed_;
            agent.neighborDist_ = this.defaultAgent_.neighborDist_;
            agent.position_ = position;
            agent.radius_ = this.defaultAgent_.radius_;
            agent.timeHorizon_ = this.defaultAgent_.timeHorizon_;
            agent.timeHorizonObst_ = this.defaultAgent_.timeHorizonObst_;
            agent.velocity_ = this.defaultAgent_.velocity_;
            agent.mass_ = this.defaultAgent_.mass_;
        }

        this.agentMap.set(agent.id_, agent);
        this._change = true;
        return agent.id_;
    }

    removeAgent(pAgentId: number) {
        let t = this;
        if (t.agentMap.has(pAgentId)) {
            t.agentMap.delete(pAgentId);
            t._change = true;
        }
    }

    public addObstacle(vertices: Array<Vector2>) {
        if (vertices.length < 2) return -1;

        let obstacleNo = this.obstacles_.length;
        for (let i = 0; i < vertices.length; ++i) {
            let obstacle = new Obstacle();
            obstacle.point_ = vertices[i];

            if (i != 0) {
                obstacle.previous_ = this.obstacles_[this.obstacles_.length - 1];
                obstacle.previous_.next_ = obstacle;
            }

            if (i == vertices.length - 1) {
                obstacle.next_ = this.obstacles_[obstacleNo];
                obstacle.next_.previous_ = obstacle;
            }

            obstacle.direction_ = RVOMath.normalize(Vector2.subtract(vertices[(i == vertices.length - 1 ? 0 : i + 1)], vertices[i]));

            if (vertices.length == 2) {
                obstacle.convex_ = true;
            } else {
                obstacle.convex_ = (RVOMath.leftOf(vertices[(i == 0 ? vertices.length - 1 : i - 1)], vertices[i], vertices[(i == vertices.length - 1 ? 0 : i + 1)]) >= 0);
            }

            obstacle.id_ = this.obstacles_.length;
            this.obstacles_.push(obstacle);
        }

        return obstacleNo;
    }

    public getAgentPosition(agentId: number) {
        let agent = this.agentMap.get(agentId);
        if (agent) {
            return agent.position_;
        } else {
            return new Vector2(0, 0);
        }
    }

    public getAgentPrefVelocity(agentId: number) {
        let t = this;
        let t_agent = t.agentMap.get(agentId);
        if (t_agent) {
            return t_agent.prefVelocity_;
        }
    }

    public setTimeStep(timeStep: number) {
        this.timeStep_ = timeStep;
    }

    public setAgentDefaults(
        neighborDist: number,
        maxNeighbors: number,
        timeHorizon: number,
        timeHorizonObst: number,
        radius: number,
        maxSpeed: number,
        velocity: Vector2,
        mass: number,
    ) {
        if (this.defaultAgent_ == null) {
            this.defaultAgent_ = new Agent();
        }

        this.defaultAgent_.maxNeighbors_ = maxNeighbors;
        this.defaultAgent_.maxSpeed_ = maxSpeed;
        this.defaultAgent_.neighborDist_ = neighborDist;
        this.defaultAgent_.radius_ = radius;
        this.defaultAgent_.timeHorizon_ = timeHorizon;
        this.defaultAgent_.timeHorizonObst_ = timeHorizonObst;
        this.defaultAgent_.velocity_ = velocity;
        this.defaultAgent_.mass_ = mass;

        return this.defaultAgent_;
    }

    public processObstacles() {
        this.kdTree_.buildObstacleTree();
    }

    public setAgentPrefVelocity(agentId: number, prefVelocity: Vector2) {
        let t = this;
        let t_agent = t.agentMap.get(agentId);
        if (t_agent) {
            t_agent.prefVelocity_ = prefVelocity;
        }
    }
}

export class AgentCfg {
    public neighborDist: number;
    public maxNeighbors: number;
    public timeHorizon: number;
    public timeHorizonObst: number;
    public radius: number;
    public maxSpeed: number;
    public velocity: Vector2;
    mass: number;

    speedFactor: number = 1;

    constructor(
        neighborDist?: number,
        maxNeighbors?: number,
        timeHorizon?: number,
        timeHorizonObst?: number,
        radius?: number,
        maxSpeed?: number,
        velocity?: Vector2,
        mass?: number
    ) {
        if (neighborDist != undefined)
            this.neighborDist = neighborDist;
        if (maxNeighbors != undefined)
            this.maxNeighbors = maxNeighbors;
        if (timeHorizon != undefined)
            this.timeHorizon = timeHorizon;
        if (timeHorizonObst != undefined)
            this.timeHorizonObst = timeHorizonObst;
        if (radius != undefined)
            this.radius = radius;
        if (maxSpeed != undefined)
            this.maxSpeed = maxSpeed;
        if (velocity != undefined)
            this.velocity = velocity;
        if (mass != undefined)
            this.mass = mass;
    }

    copyFromAgent(pAgent: Agent) {
        let t = this;
        t.neighborDist = pAgent.neighborDist_;
        t.maxNeighbors = pAgent.maxNeighbors_;
        t.timeHorizon = pAgent.timeHorizon_;
        t.timeHorizonObst = pAgent.timeHorizonObst_;
        t.radius = pAgent.radius_;
        t.maxSpeed = pAgent.maxSpeed_;
        t.velocity = pAgent.velocity_;
        t.mass = pAgent.mass_;
    }
}