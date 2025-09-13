declare module "array-keyed-map" {
  export default class ArrayKeyedMap<K extends unknown[], V> {
    constructor(iter?: Iterable<[K, V]>);
    set(key: K, val: V): void;
    has(key: K): boolean;
    get(key: K): V | undefined;
    delete(key: K): void;
    clear(): void;
    hasPrefix(key: K);
    entries(): Iterator<[K, V]>;
    keys(): Iterator<K>;
    values(): Iterator<V>;
    forEach(callback: (val: V, key: K, map: ArrayKeyedMap<K, V>) => void): void;
  }
}
