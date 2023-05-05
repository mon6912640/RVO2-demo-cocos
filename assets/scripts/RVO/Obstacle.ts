import Vector2 from "./Vector2";


export default class Obstacle {
    public next_: Obstacle;
    public previous_: Obstacle;
    public direction_: Vector2;
    public point_: Vector2;
    public id_: number;
    public convex_: boolean;
}