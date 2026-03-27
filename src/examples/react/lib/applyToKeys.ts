// https://github.com/gcanti/fp-ts/issues/1208
type ValueOf<A> = A[keyof A];
export type HKT = {
  param: unknown;
  result: unknown;
};
export type Apply<H extends HKT, A> = (H & { param: A })["result"];
const applyToKeys =
  <H extends HKT>() =>
  <
    R extends Record<string, unknown>,
    F extends <A>(a: ValueOf<R>) => Apply<H, ValueOf<R>>,
  >(
    r: R,
    fn: F,
  ): {
    [K in keyof R]: Apply<H, R[K]>;
  } => {
    return Object.fromEntries(
      Object.entries(r).map(([key, val]) => [key, fn(val as never)]),
    ) as {
      [K in keyof R]: Apply<H, R[K]>;
    };
  };

interface Fn1HKT extends HKT {
  result: this["param"] extends infer A ? { feedMe: A } : never;
}
const result = applyToKeys<Fn1HKT>()(
  {
    a: 3,
    b: "abc",
  },
  (a) => ({ feedMe: a }),
);

interface Fn2HKT extends HKT {
  result: this["param"] extends { feedMe: infer A } ? A : never;
}
const result2 = applyToKeys<Fn2HKT>()(result, (a) => a.feedMe);
