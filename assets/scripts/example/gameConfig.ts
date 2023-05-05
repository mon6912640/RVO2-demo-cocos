import Vector2 from "../RVO/Vector2";

export default class GameConfig
{
    /**代理对象总数 */
    public static agentCount = 60;
    /**代理对象之间的距离 */
    public static neighborDist = 35;
    /**代理对象的半径 */
    public static radius = 10;
    /**代理对象的最大移动速度 */
    public static maxSpeed = 200;
    /**代理对象的初始速度 */
    public static velocity = new Vector2(0, 0);
    /**最大邻居数 */
    public static maxNeighbors = 10;
    /**安全单位时间，它乘以最大速度就是agent的避让探针，值越大，就会越早做出避让行为 */
    public static timeHorizon = 25;
    /**与timeHorizon类似，只针对障碍物 */
    public static timeHorizonObst = 5;

    /**步骤帧 */
    public static gameTimeStep = 0.25;
}