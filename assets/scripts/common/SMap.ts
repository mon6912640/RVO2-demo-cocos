/**
 * @author: lujiahao 
 * @date: 2021-07-14 22:11:35 
 */
export class SMap<K, V> {
    private _size = 0;
    public get size() {
        return this._size;
    }
    private _keyMap: { [key: string]: boolean } = {};

    constructor() {
    }

    private _change = 0;
    private _keys: K[];
    private _values: V[];
    private _kvs: [K, V][];

    set(pKey: K, pValue: V) {
        let t = this;
        if (!t._keyMap[pKey as any]) {
            t._size++;
        }
        t[pKey as any] = pValue;
        t._keyMap[pKey as any] = true;
        t._change |= 0b111;
    }

    delete(pKey: K) {
        let t = this;
        if (!t._keyMap[pKey as any])
            return;
        delete t[pKey as any];
        delete t._keyMap[pKey as any];
        t._size--;
        t._change |= 0b111;
    }

    has(pKey: K) {
        let t = this;
        return t._keyMap[pKey as any] ? true : false;
    }

    get(pKey: K): V {
        let t = this;
        return t[pKey as any];
    }

    clear() {
        let t = this;
        for (let k in t._keyMap) {
            delete t[k];
            delete t._keyMap[k];
            t._change |= 0b111;
        }
        if (t._keys)
            t._keys.length = 0;
        if (t._values)
            t._values.length = 0;
        if (t._kvs)
            t._kvs.length = 0;
        t._size = 0;
    }

    keys() {
        let t = this;
        if (!t._keys)
            t._keys = [];
        if (t._change & 0b1) {
            t._change ^= 0b1;
            t._keys.length = 0;

            for (let k in t._keyMap) {
                t._keys.push(<any>k);
            }
        }
        return t._keys;
    }

    values() {
        let t = this;
        if (!t._values)
            t._values = [];
        if (t._change & 0b10) {
            t._change ^= 0b10;
            t._values.length = 0;

            for (let k in t._keyMap) {
                let t_value = <V>t[k];
                t._values.push(t_value);
            }
        }
        return t._values;
    }

    kvs() {
        let t = this;
        if (!t._kvs)
            t._kvs = [];
        if (t._change & 0b100) {
            t._change ^= 0b100;
            t._kvs.length = 0;
            for (let key in t._keyMap) {
                let value = <V>t[key];
                t._kvs.push([<any>key, value]);
            }
        }
        return t._kvs;
    }

    /**
     * 遍历
     * @param pCallback 回调函数如果返回false则停止遍历
     * @param pThisObj 
     * @returns 
     */
    forEach(pCallback: (k: K, v: V) => any, pThisObj: any) {
        let t = this;
        for (let key in t._keyMap) {
            let ret = pCallback.call(pThisObj, key, t[key]);
            if (ret === false) {
                return;
            }
        }
    }
}