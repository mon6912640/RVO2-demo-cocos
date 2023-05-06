import { KeyValuePair, ObserverObj } from "./commonDefine";
import Line from "./Line";
import Obstacle from "./Obstacle";
import RVOMath from "./RVOMath";
import Simulator from "./Simulator";
import Vector2 from "./Vector2";


export default class Agent {
    public agentNeighbors_: Array<KeyValuePair<number, Agent>> = [];
    public obstacleNeighbors_: Array<KeyValuePair<number, Obstacle>> = [];
    public orcaLines_: Array<Line> = [];
    public position_: Vector2;
    public prefVelocity_: Vector2 = new Vector2(0, 0);
    public id_: number;

    public velocity_: Vector2;
    /** 寻找周围邻居的最大数目，这个值设置越大，最终计算的速度越 精确，但会加大计算量 */
    public maxNeighbors_: number;
    /** 在寻找周围邻居的搜索距离，这个值设置过大，会让小球在很远 距离的时候做出避障行为 */
    public neighborDist_: number;
    /** 代表计算ORCA时的小球的半径，这个值不一定与小球实际显示的半径 一样，偏小有利于小球移动顺畅 */
    public radius_: number;
    /** 理解为预测提前规避时间，他与速度有关系，你预测的越早的话，提前就会做出速度修改（但是原文说会限制速度，不是很明白怎么限制的） */
    public timeHorizon_: number;
    public timeHorizonObst_: number;
    /** 最大速度，由于RVO中不考虑加速度，他是直接变速的，所以最大能变的速度是多少会和这个提前规避时间一起作用得到规避时的动作幅度 */
    public maxSpeed_: number;

    public mass_: number = 1;

    public needDelete_: boolean = false;

    private newVelocity_: Vector2 = new Vector2(0, 0);

    public update() {
        this.velocity_ = this.newVelocity_;
        let v2 = Vector2.addition(this.position_, Vector2.multiply2(Simulator.Instance.timeStep_, this.velocity_));
        this.position_ = v2;
    }

    public insertObstacleNeighbor(obstacle: Obstacle, rangeSq: number) {
        let nextObstacle = obstacle.next_;
        let distSq = RVOMath.distSqPointLineSegment(obstacle.point_, nextObstacle.point_, this.position_);
        if (distSq < rangeSq) {
            this.obstacleNeighbors_.push(new KeyValuePair<number, Obstacle>(distSq, obstacle));
            let i = this.obstacleNeighbors_.length - 1;
            while (i != 0 && distSq < this.obstacleNeighbors_[i - 1].Key) {
                this.obstacleNeighbors_[i] = this.obstacleNeighbors_[i - 1];
                --i;
            }
            this.obstacleNeighbors_[i] = new KeyValuePair<number, Obstacle>(distSq, obstacle);
        }
    }

    public insertAgentNeighbor(agent: Agent, rangeSq: ObserverObj<number>) {
        if (agent && this != agent) {
            let distSq = RVOMath.absSq(Vector2.subtract(this.position_, agent.position_));
            if (distSq < rangeSq.value) {
                if (this.agentNeighbors_.length < this.maxNeighbors_) {
                    this.agentNeighbors_.push(new KeyValuePair<number, Agent>(distSq, agent));
                }

                let i = this.agentNeighbors_.length - 1;
                while (i != 0 && distSq < this.agentNeighbors_[i - 1].Key) {
                    this.agentNeighbors_[i] = this.agentNeighbors_[i - 1];
                    --i;
                }
                this.agentNeighbors_[i] = new KeyValuePair<number, Agent>(distSq, agent);

                if (this.agentNeighbors_.length == this.maxNeighbors_) {
                    rangeSq.value = this.agentNeighbors_[this.agentNeighbors_.length - 1].Key;
                }
            }
        }
    }

    public computeNeighbors() {
        this.obstacleNeighbors_ = [];
        let rangeSq = RVOMath.sqr(this.timeHorizonObst_ * this.maxSpeed_ + this.radius_);
        Simulator.Instance.kdTree_.computeObstacleNeighbors(this, rangeSq);

        this.agentNeighbors_ = [];
        if (this.maxNeighbors_ > 0) {
            let obserObj: ObserverObj<number> = new ObserverObj();
            obserObj.value = RVOMath.sqr(this.neighborDist_);
            Simulator.Instance.kdTree_.computeAgentNeighbors(this, obserObj);
        }
    }

    public computeNewVelocity() {
        this.orcaLines_ = [];

        let invTimeHorizonObst = 1 / this.timeHorizonObst_;

        for (let i = 0; i < this.obstacleNeighbors_.length; ++i) {
            let obstacle1 = this.obstacleNeighbors_[i].Value;
            let obstacle2 = obstacle1.next_;

            let relativePosition1 = Vector2.subtract(obstacle1.point_, this.position_);
            let relativePosition2 = Vector2.subtract(obstacle2.point_, this.position_);

            let alreadyCovered = false;
            for (let j = 0; j < this.orcaLines_.length; ++j) {
                if (RVOMath.det(Vector2.subtract(Vector2.multiply2(invTimeHorizonObst, relativePosition1), this.orcaLines_[j].point), this.orcaLines_[j].direction) - invTimeHorizonObst * this.radius_ >= -RVOMath.RVO_EPSILON && RVOMath.det(Vector2.subtract(Vector2.multiply2(invTimeHorizonObst, relativePosition2), this.orcaLines_[j].point), this.orcaLines_[j].direction) - invTimeHorizonObst * this.radius_ >= -RVOMath.RVO_EPSILON) {
                    alreadyCovered = true;
                    break;
                }
            }
            if (alreadyCovered) {
                continue;
            }

            let distSq1 = RVOMath.absSq(relativePosition1);
            let distSq2 = RVOMath.absSq(relativePosition2);

            let radiusSq = RVOMath.sqr(this.radius_);
            let obstacleVector = Vector2.subtract(obstacle2.point_, obstacle1.point_);
            let s = Vector2.multiply(Vector2.multiply2(-1, relativePosition1), obstacleVector) / RVOMath.absSq(obstacleVector);
            let distSqLine = RVOMath.absSq(Vector2.subtract(Vector2.multiply2(-1, relativePosition1), Vector2.multiply2(s, obstacleVector)));

            let line = new Line();
            if (s < 0 && distSq1 <= radiusSq) {
                if (obstacle1.convex_) {
                    line.point = new Vector2(0, 0);
                    line.direction = RVOMath.normalize(new Vector2(-relativePosition1.y, relativePosition1.x));
                    this.orcaLines_.push(line);
                }
                continue;
            } else if (s > 1 && distSq2 <= radiusSq) {
                if (obstacle2.convex_ && RVOMath.det(relativePosition2, obstacle2.direction_) >= 0) {
                    line.point = new Vector2(0, 0);
                    line.direction = RVOMath.normalize(new Vector2(-relativePosition2.y, relativePosition2.x));
                    this.orcaLines_.push(line);
                }
                continue;
            } else if (s >= 0 && s < 1 && distSqLine <= radiusSq) {
                line.point = new Vector2(0, 0);
                line.direction = Vector2.multiply2(-1, obstacle1.direction_);
                this.orcaLines_.push(line);
                continue;
            }

            let leftLegDirection: Vector2, rightLegDirection: Vector2;
            if (s < 0 && distSqLine <= radiusSq) {
                if (!obstacle1.convex_) continue;
                obstacle2 = obstacle1;
                let leg1 = RVOMath.sqrt(distSq1 - radiusSq);
                leftLegDirection = Vector2.division(new Vector2(relativePosition1.x * leg1 - relativePosition1.y * this.radius_, relativePosition1.x * this.radius_ + relativePosition1.y * leg1), distSq1);
                rightLegDirection = Vector2.division(new Vector2(relativePosition1.x * leg1 + relativePosition1.y * this.radius_, -relativePosition1.x * this.radius_ + relativePosition1.y * leg1), distSq1);
            } else if (s > 1 && distSqLine <= radiusSq) {
                if (!obstacle2.convex_) continue;
                obstacle1 = obstacle2;
                let leg2 = RVOMath.sqrt(distSq2 - radiusSq);
                leftLegDirection = Vector2.division(new Vector2(relativePosition2.x * leg2 - relativePosition2.y * this.radius_, relativePosition2.x * this.radius_ + relativePosition2.y * leg2), distSq2);
                rightLegDirection = Vector2.division(new Vector2(relativePosition2.x * leg2 + relativePosition2.y * this.radius_, -relativePosition2.x * this.radius_ + relativePosition2.y * leg2), distSq2);
            } else {
                if (obstacle1.convex_) {
                    let leg1 = RVOMath.sqrt(distSq1 - radiusSq);
                    leftLegDirection = Vector2.division(new Vector2(relativePosition1.x * leg1 - relativePosition1.y * this.radius_, relativePosition1.x * this.radius_ + relativePosition1.y * leg1), distSq1);
                } else {
                    leftLegDirection = Vector2.multiply2(-1, obstacle1.direction_);
                }

                if (obstacle2.convex_) {
                    let leg2 = RVOMath.sqrt(distSq2 - radiusSq);
                    rightLegDirection = Vector2.division(new Vector2(relativePosition2.x * leg2 - relativePosition2.y * this.radius_, relativePosition2.x * this.radius_ + relativePosition2.y * leg2), distSq2);
                } else {
                    //这个地方我不太确定是不是写错了，原文是用的obstacle1.direction_
                    rightLegDirection = Vector2.multiply2(-1, obstacle1.direction_);
                }
            }

            let leftNeighbor = obstacle1.previous_;
            let isLeftLegForeign = false;
            let isRightLegForeign = false;
            if (obstacle1.convex_ && RVOMath.det(leftLegDirection, Vector2.multiply2(-1, leftNeighbor.direction_)) >= 0) {
                leftLegDirection = Vector2.multiply2(-1, leftNeighbor.direction_);
                isLeftLegForeign = true;
            }

            if (obstacle2.convex_ && RVOMath.det(rightLegDirection, Vector2.multiply2(-1, obstacle2.direction_)) <= 0) {
                rightLegDirection = obstacle2.direction_;
                isRightLegForeign = true;
            }

            let leftCutOff = Vector2.multiply2(invTimeHorizonObst, Vector2.subtract(obstacle1.point_, this.position_));
            let rightCutOff = Vector2.multiply2(invTimeHorizonObst, Vector2.subtract(obstacle2.point_, this.position_));
            let cutOffVector = Vector2.subtract(rightCutOff, leftCutOff);

            let t = obstacle1 == obstacle2 ? 0.5 : Vector2.multiply(Vector2.subtract(this.velocity_, leftCutOff), cutOffVector) / RVOMath.absSq(cutOffVector);
            let tLeft = Vector2.multiply(Vector2.subtract(this.velocity_, leftCutOff), leftLegDirection);
            let tRight = Vector2.multiply(Vector2.subtract(this.velocity_, rightCutOff), rightLegDirection);

            if ((t < 0 && tLeft < 0) || (obstacle1 == obstacle2 && tLeft < 0 && tRight < 0)) {
                let unitW = RVOMath.normalize(Vector2.subtract(this.velocity_, leftCutOff));
                line.direction = new Vector2(unitW.y, -unitW.x);
                line.point = Vector2.addition(leftCutOff, Vector2.multiply2(this.radius_ * invTimeHorizonObst, unitW));
                this.orcaLines_.push(line);

                continue;
            } else if (t > 1 && tRight < 0) {
                let unitW = RVOMath.normalize(Vector2.subtract(this.velocity_, rightCutOff));
                line.direction = new Vector2(unitW.y, -unitW.x);
                line.point = Vector2.addition(rightCutOff, Vector2.multiply2(this.radius_ * invTimeHorizonObst, unitW));
                this.orcaLines_.push(line);

                continue;
            }

            let distSqCutoff = (t < 0 || t > 1 || obstacle1 == obstacle2) ? RVOMath.RVO_POSITIVEINFINITY : RVOMath.absSq(Vector2.subtract(this.velocity_, Vector2.addition(leftCutOff, Vector2.multiply2(t, cutOffVector))));
            let distSqLeft = tLeft < 0 ? RVOMath.RVO_POSITIVEINFINITY : RVOMath.absSq(Vector2.subtract(this.velocity_, Vector2.addition(leftCutOff, Vector2.multiply2(tLeft, leftLegDirection))));
            let distSqRight = tRight < 0 ? RVOMath.RVO_POSITIVEINFINITY : RVOMath.absSq(Vector2.subtract(this.velocity_, Vector2.addition(rightCutOff, Vector2.multiply2(tRight, rightLegDirection))));

            if (distSqCutoff <= distSqLeft && distSqCutoff <= distSqRight) {
                line.direction = Vector2.multiply2(-1, obstacle1.direction_);
                line.point = Vector2.addition(leftCutOff, Vector2.multiply2(this.radius_ * invTimeHorizonObst, new Vector2(-line.direction.y, line.direction.x)));
                this.orcaLines_.push(line);

                continue;
            }

            if (distSqLeft <= distSqRight) {
                if (isLeftLegForeign) continue;
                line.direction = leftLegDirection;
                line.point = Vector2.addition(leftCutOff, Vector2.multiply2(this.radius_ * invTimeHorizonObst, new Vector2(-line.direction.y, line.direction.x)));
                this.orcaLines_.push(line);

                continue;
            }

            if (isRightLegForeign) continue;
            line.direction = Vector2.multiply2(-1, rightLegDirection);
            line.point = Vector2.addition(rightCutOff, Vector2.multiply2(this.radius_ * invTimeHorizonObst, new Vector2(-line.direction.y, line.direction.x)));
            this.orcaLines_.push(line);
        }

        let numObstLines = this.orcaLines_.length;
        let invTimeHorizon = 1.0 / this.timeHorizon_;
        for (let i = 0; i < this.agentNeighbors_.length; ++i) {
            let other = this.agentNeighbors_[i].Value;
            if (!other) continue;

            //==============================================
            //原版ORCA对所有单位一视同仁，没要考虑有些单位需要强制穿插移动
            //这里引入了质量概念，质量大的物体，在使用ORCA计算速度时，自己的优先速度趋向于输入的优先速度，邻居的优先速度趋向于原始速度
            let massRatio = this.mass_ / (this.mass_ + other.mass_);
            let neighborMassRatio = other.mass_ / (this.mass_ + other.mass_);
            let vOpt = (massRatio >= 0.5 ?
                (this.velocity_.minus(this.velocity_.scale(massRatio)).scale(2))
                :
                this.prefVelocity_.add(this.velocity_.minus(this.prefVelocity_).scale(massRatio * 2)));
            let neighborVOpt = (neighborMassRatio >= 0.5 ?
                other.velocity_.scale(2).scale(1 - neighborMassRatio)
                :
                (other.prefVelocity_.add(other.velocity_.minus(other.prefVelocity_).scale(2 * neighborMassRatio))));
            //==============================================

            let relativePosition = Vector2.subtract(other.position_, this.position_);
            // let relativeVelocity = Vector2.subtract(this.velocity_, other.velocity_);
            let relativeVelocity = Vector2.subtract(vOpt, neighborVOpt);
            let distSq = RVOMath.absSq(relativePosition);
            let combinedRadius = this.radius_ + other.radius_;
            let combinedRadiusSq = RVOMath.sqr(combinedRadius);

            let line = new Line();
            let u = new Vector2();

            if (distSq > combinedRadiusSq) {
                let w = Vector2.subtract(relativeVelocity, Vector2.multiply2(invTimeHorizon, relativePosition));
                let wLengthSq = RVOMath.absSq(w);
                let dotProduct1 = Vector2.multiply(w, relativePosition);

                if (dotProduct1 < 0 && RVOMath.sqr(dotProduct1) > combinedRadiusSq * wLengthSq) {
                    let wLength = RVOMath.sqrt(wLengthSq);
                    let unitW = Vector2.division(w, wLength);
                    line.direction = new Vector2(unitW.y, -unitW.x);
                    u = Vector2.multiply2(combinedRadius * invTimeHorizon - wLength, unitW);
                } else {
                    let leg = RVOMath.sqrt(distSq - combinedRadiusSq);
                    if (RVOMath.det(relativePosition, w) > 0) {
                        line.direction = Vector2.division(new Vector2(relativePosition.x * leg - relativePosition.y * combinedRadius, relativePosition.x * combinedRadius + relativePosition.y * leg), distSq);
                    } else {
                        line.direction = Vector2.division(new Vector2(relativePosition.x * leg + relativePosition.y * combinedRadius, -relativePosition.x * combinedRadius + relativePosition.y * leg), -distSq);
                    }

                    let dotProduct2 = Vector2.multiply(relativeVelocity, line.direction);
                    u = Vector2.subtract(Vector2.multiply2(dotProduct2, line.direction), relativeVelocity);
                }
            } else {
                let invTimeStep = 1 / Simulator.Instance.timeStep_;
                let w = Vector2.subtract(relativeVelocity, Vector2.multiply2(invTimeStep, relativePosition));
                let wLength = RVOMath.abs(w);
                let unitW = Vector2.division(w, wLength);

                line.direction = new Vector2(unitW.y, -unitW.x);
                u = Vector2.multiply2(combinedRadius * invTimeStep - wLength, unitW);
            }
            // line.point = Vector2.addition(this.velocity_, Vector2.multiply2(0.5, u));
            // line.point = Vector2.addition(vOpt, Vector2.multiply2(0.5, u));
            line.point = vOpt.add(u.scale(massRatio));
            this.orcaLines_[this.orcaLines_.length] = line;
        }

        let tempVelocity_ = new ObserverObj<Vector2>(new Vector2(this.newVelocity_.x, this.newVelocity_.y));
        let lineFail = this.linearProgram2(this.orcaLines_, this.maxSpeed_, this.prefVelocity_, false, tempVelocity_);
        if (lineFail < this.orcaLines_.length) {
            this.linearProgram3(this.orcaLines_, numObstLines, lineFail, this.maxSpeed_, tempVelocity_);
        }
        this.newVelocity_ = tempVelocity_.value;
    }

    private linearProgram1(lines: Array<Line>, lineNo: number, radius: number, optVelocity: Vector2, directionOpt: boolean, result: ObserverObj<Vector2>): boolean {
        let dotProduct = Vector2.multiply(lines[lineNo].point, lines[lineNo].direction);
        let discriminant = RVOMath.sqr(dotProduct) + RVOMath.sqr(radius) - RVOMath.absSq(lines[lineNo].point);

        if (discriminant < 0) {
            return false;
        }

        let sqrtDiscriminant = RVOMath.sqrt(discriminant);
        let tLeft = -dotProduct - sqrtDiscriminant;
        let tRight = -dotProduct + sqrtDiscriminant;

        for (let i = 0; i < lineNo; ++i) {
            let denominator = RVOMath.det(lines[lineNo].direction, lines[i].direction);
            let numerator = RVOMath.det(lines[i].direction, Vector2.subtract(lines[lineNo].point, lines[i].point));

            if (RVOMath.fabs(denominator) <= RVOMath.RVO_EPSILON) {
                if (numerator < 0) {
                    return false;
                }
                continue;
            }

            let t = numerator / denominator;

            if (denominator > 0) {
                tRight = Math.min(tRight, t);
            } else {
                tLeft = Math.max(tLeft, t);
            }

            if (tLeft > tRight) {
                return false;
            }
        }

        if (directionOpt) {
            if (Vector2.multiply(optVelocity, lines[lineNo].direction) > 0) {
                result.value = Vector2.addition(lines[lineNo].point, Vector2.multiply2(tRight, lines[lineNo].direction));
            } else {
                result.value = Vector2.addition(lines[lineNo].point, Vector2.multiply2(tLeft, lines[lineNo].direction));
            }
        } else {
            let t = Vector2.multiply(lines[lineNo].direction, Vector2.subtract(optVelocity, lines[lineNo].point));
            if (t < tLeft) {
                result.value = Vector2.addition(lines[lineNo].point, Vector2.multiply2(tLeft, lines[lineNo].direction));
            } else if (t > tRight) {
                result.value = Vector2.addition(lines[lineNo].point, Vector2.multiply2(tRight, lines[lineNo].direction));
            } else {
                result.value = Vector2.addition(lines[lineNo].point, Vector2.multiply2(t, lines[lineNo].direction));
            }
        }

        return true;
    }

    private linearProgram2(lines: Array<Line>, radius: number, optVelocity: Vector2, directionOpt: boolean, result: ObserverObj<Vector2>): number {
        if (directionOpt) {
            result.value = Vector2.multiply2(radius, optVelocity);
        } else if (RVOMath.absSq(optVelocity) > RVOMath.sqr(radius)) {
            result.value = Vector2.multiply2(radius, RVOMath.normalize(optVelocity));
        } else {
            result.value = optVelocity;
        }

        for (let i = 0; i < lines.length; ++i) {
            if (RVOMath.det(lines[i].direction, Vector2.subtract(lines[i].point, result.value)) > 0) {
                let tempResult = new Vector2(result.value.x, result.value.y);
                if (!this.linearProgram1(lines, i, radius, optVelocity, directionOpt, result)) {
                    result.value = tempResult;
                    return i;
                }
            }
        }

        return lines.length;
    }

    private linearProgram3(lines: Array<Line>, numObstLines: number, beginLine: number, radius: number, result: ObserverObj<Vector2>) {
        let distance = 0;
        for (let i = beginLine; i < lines.length; ++i) {
            if (RVOMath.det(lines[i].direction, Vector2.subtract(lines[i].point, result.value)) > distance) {
                let projLines: Array<Line> = [];
                for (let ii = 0; ii < numObstLines; ++ii) {
                    projLines[projLines.length] = lines[ii];
                }

                for (let j = numObstLines; j < i; ++j) {
                    let line = new Line();
                    let determinant = RVOMath.det(lines[i].direction, lines[j].direction);
                    if (RVOMath.fabs(determinant) <= RVOMath.RVO_EPSILON) {
                        if (Vector2.multiply(lines[i].direction, lines[j].direction) > 0.0) {
                            continue;
                        } else {
                            line.point = Vector2.multiply2(0.5, Vector2.addition(lines[i].point, lines[j].point));
                        }
                    } else {
                        line.point = Vector2.addition(lines[i].point, Vector2.multiply2(RVOMath.det(lines[j].direction, Vector2.subtract(lines[i].point, lines[j].point)) / determinant, lines[i].direction));
                    }

                    line.direction = RVOMath.normalize(Vector2.subtract(lines[j].direction, lines[i].direction));
                    projLines[projLines.length] = line;
                }

                let tempResult = new Vector2(result.value.x, result.value.y);
                if (this.linearProgram2(projLines, radius, new Vector2(-lines[i].direction.y, lines[i].direction.x), true, result) < projLines.length) {
                    result.value = tempResult;
                }
                distance = RVOMath.det(lines[i].direction, Vector2.subtract(lines[i].point, result.value));
            }
        }
    }
}