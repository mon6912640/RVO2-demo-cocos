

export default class Vector2 {
    public x: number;
    public y: number;
    constructor(x?: number, y?: number) {
        if (x != undefined)
            this.x = x;
        if (y != undefined)
            this.y = y;
    }

    /**
     * 乘法
     * @param vector1 
     * @param vector2 
     * @returns 
     */
    public static multiply(vector1: Vector2, vector2: Vector2) {
        return vector1.x * vector2.x + vector1.y * vector2.y;
    }

    /**
     * 乘法
     * @param scalar 
     * @param vector 
     * @returns 
     */
    public static multiply2(scalar: number, vector: Vector2) {
        return new Vector2(vector.x * scalar, vector.y * scalar);
    }

    /**
     * 除法
     * @param vector 
     * @param scalar 
     * @returns 
     */
    public static division(vector: Vector2, scalar: number) {
        return new Vector2(vector.x / scalar, vector.y / scalar);
    }

    /**
     * 减法
     * @param vector1 
     * @param vector2 
     */
    public static subtract(vector1: Vector2, vector2: Vector2) {
        return new Vector2(vector1.x - vector2.x, vector1.y - vector2.y)
    }

    /**
     * 加法
     * @param vector1 
     * @param vector2 
     */
    public static addition(vector1: Vector2, vector2: Vector2) {
        return new Vector2(vector1.x + vector2.x, vector1.y + vector2.y);
    }
}