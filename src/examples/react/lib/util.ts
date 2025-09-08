// & is slow, this is faster
export type FastAnd<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};

// built on the idea that `[number | string] extends [number]` is false
// returns `true` for boolean tho =(
// built this to help solve the problem that shared keys
// in `FastUnionToIntersection` are unionized, not intersected
// but, I couldn't figure it out, maybe more complicated than it's worth
type IsUnion<A> = [A] extends infer B
  ? B extends [infer C]
    ? C extends any
      ? [A] extends [C]
        ? false
        : true
      : never
    : never
  : never;

// this results in &, which is slow
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never;

// built on the idea that `A extends any ? (K extends keyof A ? A : never) : never`
// returns all of the valuese of A that extend K
export type FastUnionToIntersection<A> = {
  [K in A extends any ? keyof A : never]: (A extends any ? (K extends keyof A ? A : never) : never)[K] extends Record<
    string,
    unknown
  >
    ? FastUnionToIntersection<A[K]>
    : (A extends any ? (K extends keyof A ? A : never) : never)[K];
};

export type NonEmptyArray<A> = [A, ...A[]];
