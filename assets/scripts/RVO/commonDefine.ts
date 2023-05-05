

export class ObserverObj<T>{
    public value: T;

    constructor(val?: T) {
        if (val)
            this.value = val;
    }
}

export class KeyValuePair<K, V>{
    public Key: K;
    public Value: V;

    constructor(key: K, value: V) {
        this.Key = key;
        this.Value = value;
    }
}