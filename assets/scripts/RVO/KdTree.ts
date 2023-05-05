import Agent from "./Agent";
import { ObserverObj } from "./commonDefine";
import Obstacle from "./Obstacle";
import RVOMath from "./RVOMath";
import Simulator from "./Simulator";
import Vector2 from "./Vector2";

class ObstacleTreeNode {
    public obstacle_: Obstacle;
    public left_: ObstacleTreeNode;
    public right_: ObstacleTreeNode;
}

class AgentTreeNode {
    begin_: number;
    end_: number;
    left_: number;
    right_: number;
    maxX_: number;
    maxY_: number;
    minX_: number;
    minY_: number;
}

class FloatPair {
    private a_: number;
    private b_: number;

    constructor(a: number, b: number) {
        this.a_ = a;
        this.b_ = b;
    }

    /**
     * 小于
     * @param pair1 
     * @param pair2 
     * @returns 
     */
    public static Lessthan(pair1: FloatPair, pair2: FloatPair) {
        return pair1.a_ < pair2.a_ || !(pair2.a_ < pair1.a_) && pair1.b_ < pair2.b_;
    }

    /**
     * 小于等于
     * @param pair1 
     * @param pair2 
     * @returns 
     */
    public static LessthanOrEqual(pair1: FloatPair, pair2: FloatPair) {
        return (pair1.a_ == pair2.a_ && pair1.b_ == pair2.b_) || FloatPair.Lessthan(pair1, pair2);
    }

    /**
     * 大于
     * @param pair1 
     * @param pair2 
     * @returns 
     */
    public static Morethan(pair1: FloatPair, pair2: FloatPair) {
        return !FloatPair.LessthanOrEqual(pair1, pair2);
    }

    /**
     * 大于等于
     * @param pair1 
     * @param pair2 
     * @returns 
     */
    public static MorethanOrEqual(pair1: FloatPair, pair2: FloatPair) {
        return !FloatPair.Lessthan(pair1, pair2);
    }
}

export default class KdTree {
    private agents_: Array<Agent>;
    private obstacleTree_: ObstacleTreeNode;
    private agentTree_: Array<AgentTreeNode>;
    private MAX_LEAF_SIZE = 10;

    public buildAgentTree() {
        if (this.agents_ == null || this.agents_.length != Simulator.Instance.agents_.length) {
            this.agents_ = new Array(Simulator.Instance.agents_.length);
            let len1 = this.agents_.length;
            for (let i = 0; i < len1; ++i) {
                this.agents_[i] = Simulator.Instance.agents_[i];
            }

            this.agentTree_ = [];
            let len = 2 * this.agents_.length;
            for (let i = 0; i < len; ++i) {
                this.agentTree_[i] = new AgentTreeNode();
            }
        }

        if (this.agents_.length != 0) {
            this.buildAgentTreeRecursive(0, this.agents_.length, 0);
        }
    }

    private buildAgentTreeRecursive(begin: number, end: number, node: number) {
        this.agentTree_[node].begin_ = begin;
        this.agentTree_[node].end_ = end;
        this.agentTree_[node].minX_ = this.agentTree_[node].maxX_ = this.agents_[begin].position_.x;
        this.agentTree_[node].minY_ = this.agentTree_[node].maxY_ = this.agents_[begin].position_.y;

        for (let i = begin + 1; i < end; ++i) {
            this.agentTree_[node].maxX_ = Math.max(this.agentTree_[node].maxX_, this.agents_[i].position_.x);
            this.agentTree_[node].minX_ = Math.min(this.agentTree_[node].minX_, this.agents_[i].position_.x);
            this.agentTree_[node].maxY_ = Math.max(this.agentTree_[node].maxY_, this.agents_[i].position_.y);
            this.agentTree_[node].minY_ = Math.min(this.agentTree_[node].minY_, this.agents_[i].position_.y);
        }

        if (end - begin > this.MAX_LEAF_SIZE) {
            let isVertical = this.agentTree_[node].maxX_ - this.agentTree_[node].minX_ > this.agentTree_[node].maxY_ - this.agentTree_[node].minY_;
            let splitValue = 0.5 * (isVertical ? this.agentTree_[node].maxX_ + this.agentTree_[node].minX_ : this.agentTree_[node].maxY_ + this.agentTree_[node].minY_);

            let left = begin;
            let right = end;

            while (left < right) {
                while (left < right && (isVertical ? this.agents_[left].position_.x : this.agents_[left].position_.y) < splitValue) {
                    ++left;
                }
                while (right > left && (isVertical ? this.agents_[right - 1].position_.x : this.agents_[right - 1].position_.y) >= splitValue) {
                    --right;
                }

                if (left < right) {
                    let tempAgent = this.agents_[left];
                    this.agents_[left] = this.agents_[right - 1];
                    this.agents_[right - 1] = tempAgent;
                    ++left;
                    --right;
                }
            }

            let leftSize = left - begin;
            if (leftSize == 0) {
                ++leftSize;
                ++left;
                ++right;
            }

            this.agentTree_[node].left_ = node + 1;
            this.agentTree_[node].right_ = node + 2 * leftSize;

            this.buildAgentTreeRecursive(begin, left, this.agentTree_[node].left_);
            this.buildAgentTreeRecursive(left, end, this.agentTree_[node].right_);
        }
    }

    public buildObstacleTree() {
        this.obstacleTree_ = new ObstacleTreeNode();
        const num = Simulator.Instance.obstacles_.length;
        let obstacles: Array<Obstacle> = [];
        for (let i = 0; i < num; ++i) {
            obstacles[obstacles.length] = Simulator.Instance.obstacles_[i];
        }
        this.obstacleTree_ = this.buildObstacleTreeRecursive(obstacles);
    }

    private buildObstacleTreeRecursive(obstacles: Array<Obstacle>): any {
        if (!obstacles || obstacles.length == 0) return;
        let node = new ObstacleTreeNode();

        let optimalSplit = 0;
        let minLeft = obstacles.length;
        let minRight = obstacles.length;

        for (let i = 0; i < obstacles.length; ++i) {
            let leftSize = 0;
            let rightSize = 0;

            let obstacleI1 = obstacles[i];
            let obstacleI2 = obstacleI1.next_;

            for (let j = 0; j < obstacles.length; ++j) {
                if (i == j) {
                    continue;
                }

                let obstacleJ1 = obstacles[j];
                let obstacleJ2 = obstacleJ1.next_;

                let j1LeftOfI = RVOMath.leftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ1.point_);
                let j2LeftOfI = RVOMath.leftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ2.point_);

                if (j1LeftOfI >= -RVOMath.RVO_EPSILON && j2LeftOfI >= -RVOMath.RVO_EPSILON) {
                    ++leftSize;
                }
                else if (j1LeftOfI <= RVOMath.RVO_EPSILON && j2LeftOfI <= RVOMath.RVO_EPSILON) {
                    ++rightSize;
                }
                else {
                    ++leftSize;
                    ++rightSize;
                }

                if (FloatPair.MorethanOrEqual(new FloatPair(Math.max(leftSize, rightSize), Math.min(leftSize, rightSize)), new FloatPair(Math.max(minLeft, minRight), Math.min(minLeft, minRight)))) {
                    break;
                }
            }

            if (FloatPair.Lessthan(new FloatPair(Math.max(leftSize, rightSize), Math.min(leftSize, rightSize)), new FloatPair(Math.max(minLeft, minRight), Math.min(minLeft, minRight)))) {
                minLeft = leftSize;
                minRight = rightSize;
                optimalSplit = i;
            }
        }

        let leftObstacles = new Array<Obstacle>(minLeft);
        let rightObstacles = new Array<Obstacle>(minRight);

        let leftCounter = 0;
        let rightCounter = 0;
        let i = optimalSplit;

        let obstacleI1 = obstacles[i];
        let obstacleI2 = obstacleI1.next_;

        for (let j = 0; j < obstacles.length; ++j) {
            if (i == j) {
                continue;
            }

            let obstacleJ1 = obstacles[j];
            let obstacleJ2 = obstacleJ1.next_;

            let j1LeftOfI = RVOMath.leftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ1.point_);
            let j2LeftOfI = RVOMath.leftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ2.point_);

            if (j1LeftOfI >= -RVOMath.RVO_EPSILON && j2LeftOfI >= -RVOMath.RVO_EPSILON) {
                leftObstacles[leftCounter++] = obstacles[j];
            }
            else if (j1LeftOfI <= RVOMath.RVO_EPSILON && j2LeftOfI <= RVOMath.RVO_EPSILON) {
                rightObstacles[rightCounter++] = obstacles[j];
            } else {
                let t = RVOMath.det(Vector2.subtract(obstacleI2.point_, obstacleI1.point_), Vector2.subtract(obstacleJ1.point_, obstacleI1.point_)) / RVOMath.det(Vector2.subtract(obstacleI2.point_, obstacleI1.point_), Vector2.subtract(obstacleJ1.point_, obstacleJ2.point_));

                let splitPoint = Vector2.addition(obstacleJ1.point_, Vector2.multiply2(t, (Vector2.subtract(obstacleJ2.point_, obstacleJ1.point_))));

                let newObstacle = new Obstacle();
                newObstacle.point_ = splitPoint;
                newObstacle.previous_ = obstacleJ1;
                newObstacle.next_ = obstacleJ2;
                newObstacle.convex_ = true;
                newObstacle.direction_ = obstacleJ1.direction_;

                newObstacle.id_ = Simulator.Instance.obstacles_.length;

                Simulator.Instance.obstacles_.push(newObstacle);

                obstacleJ1.next_ = newObstacle;
                obstacleJ2.previous_ = newObstacle;

                if (j1LeftOfI > 0.0) {
                    leftObstacles[leftCounter++] = obstacleJ1;
                    rightObstacles[rightCounter++] = newObstacle;
                }
                else {
                    rightObstacles[rightCounter++] = obstacleJ1;
                    leftObstacles[leftCounter++] = newObstacle;
                }
            }
        }

        node.obstacle_ = obstacleI1;
        node.left_ = this.buildObstacleTreeRecursive(leftObstacles);
        node.right_ = this.buildObstacleTreeRecursive(rightObstacles);

        return node;
    }

    public computeObstacleNeighbors(agent: Agent, rangeSq: number) {
        this.queryObstacleTreeRecursive(agent, rangeSq, this.obstacleTree_)
    }

    private queryObstacleTreeRecursive(agent: Agent, rangeSq: number, node: ObstacleTreeNode) {
        if (!agent || !node) return;
        let obstacle1: Obstacle = node.obstacle_;
        let obstacle2: Obstacle = obstacle1.next_;

        let agentLeftOfLine = RVOMath.leftOf(obstacle1.point_, obstacle2.point_, agent.position_);
        this.queryObstacleTreeRecursive(agent, rangeSq, agentLeftOfLine >= 0 ? node.left_ : node.right_);

        let distSqLine = RVOMath.sqr(agentLeftOfLine) / RVOMath.absSq(Vector2.subtract(obstacle2.point_, obstacle1.point_));
        if (distSqLine < rangeSq) {
            if (agentLeftOfLine < 0) {
                agent.insertObstacleNeighbor(node.obstacle_, rangeSq);
            }
            this.queryObstacleTreeRecursive(agent, rangeSq, agentLeftOfLine >= 0 ? node.right_ : node.left_);
        }
    }

    public computeAgentNeighbors(agent: Agent, obserObj: ObserverObj<number>) {
        this.queryAgentTreeRecursive(agent, obserObj, 0);
    }

    private queryAgentTreeRecursive(agent: Agent, obserObj: ObserverObj<number>, node: number) {
        let agentTree = this.agentTree_[node];
        if (agentTree.end_ - agentTree.begin_ <= this.MAX_LEAF_SIZE) {
            for (let i = agentTree.begin_; i < agentTree.end_; ++i) {
                agent.insertAgentNeighbor(this.agents_[i], obserObj);
            }
        } else {
            let distSqLeft = RVOMath.sqr(Math.max(0, this.agentTree_[this.agentTree_[node].left_].minX_ - agent.position_.x)) + RVOMath.sqr(Math.max(0, agent.position_.x - this.agentTree_[this.agentTree_[node].left_].maxX_)) + RVOMath.sqr(Math.max(0, this.agentTree_[this.agentTree_[node].left_].minY_ - agent.position_.y)) + RVOMath.sqr(Math.max(0, agent.position_.y - this.agentTree_[this.agentTree_[node].left_].maxY_));
            // let distSqRight = RVOMath.sqr(Math.max(0, this.agentTree_[this.agentTree_[node].right_].minX_ - agent.position_.x)) + RVOMath.sqr(Math.max(0, agent.position_.x - this.agentTree_[this.agentTree_[node].right_].maxX_)) + RVOMath.sqr(Math.max(0, this.agentTree_[this.agentTree_[node].right_].minY_ - agent.position_.y)) + RVOMath.sqr(Math.max(0, agent.position_.y - this.agentTree_[this.agentTree_[node].right_].maxY_));

            let treeNode = this.agentTree_[this.agentTree_[node].right_];
            let distSqRight_1 = RVOMath.sqr(Math.max(0, treeNode.minX_ - agent.position_.x));
            let distSqRight_2 = RVOMath.sqr(Math.max(0, agent.position_.x - treeNode.maxX_));
            let distSqRight_3 = RVOMath.sqr(Math.max(0, treeNode.minY_ - agent.position_.y));
            let distSqRight_4 = RVOMath.sqr(Math.max(0, agent.position_.y - treeNode.maxY_));
            let distSqRight = distSqRight_1 + distSqRight_2 + distSqRight_3 + distSqRight_4;

            if (distSqLeft < distSqRight) {
                if (distSqLeft < obserObj.value) {
                    this.queryAgentTreeRecursive(agent, obserObj, this.agentTree_[node].left_);

                    if (distSqRight < obserObj.value) {
                        this.queryAgentTreeRecursive(agent, obserObj, this.agentTree_[node].right_);
                    }
                }
            } else {
                if (distSqRight < obserObj.value) {
                    this.queryAgentTreeRecursive(agent, obserObj, this.agentTree_[node].right_);

                    if (distSqLeft < obserObj.value) {
                        this.queryAgentTreeRecursive(agent, obserObj, this.agentTree_[node].left_);
                    }
                }
            }
        }
    }
}