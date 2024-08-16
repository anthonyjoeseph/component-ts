import * as r from "rxjs";
import * as ro from "rxjs/operators";
import * as Eq from "fp-ts/Eq";

import BS = r.BehaviorSubject;
import { applyAction, SafeDOMAction } from "./array/DOMAction";
import { arrayDiffEq } from "./array/diff";

export const distinctUntilChanged = ro.distinctUntilChanged;

export type BehaviorSubjectLike<A> = r.Observable<A> & {
  getValue: () => A;
  next: (a: A) => void;
};
export type TypeOf<A extends BehaviorSubjectLike<any>> = A extends BehaviorSubjectLike<infer T> ? T : never;

export const struct = <A>(subjs: {
  [K in keyof A]: BehaviorSubjectLike<A[K]>;
}): BehaviorSubjectLike<A> => {
  // emit once on subscribe
  const allowEmit = new BS<number>(1);

  const getValue = () =>
    Object.fromEntries(
      Object.entries(subjs as Record<string, BS<unknown>>).map(([key, subj]) => [key, subj.getValue()] as const)
    ) as A;
  const next = (newVal: A) => {
    allowEmit.next(allowEmit.getValue() + 1);
    Object.entries(subjs).map(([key, subj]) => (subj as BS<unknown>).next((newVal as Record<string, unknown>)[key]));
  };

  const obs = r
    .merge(
      ...Object.entries(subjs).map(([key, subj]) =>
        (subj as r.Observable<unknown>).pipe(
          ro.map(
            (v): A => ({
              ...getValue(),
              [key]: v,
            })
          )
        )
      )
    )
    .pipe(
      ro.filter(() => {
        if (0 < allowEmit.getValue()) {
          allowEmit.next(allowEmit.getValue() - 1);
          return true;
        }
        return false;
      }),
      ro.finalize(() => allowEmit.complete())
    ) as BehaviorSubjectLike<A>;
  obs.getValue = getValue;
  obs.next = next;
  return obs;
};

export const keysFromDefault = <A extends Record<string, unknown>>(defaultValue: A) =>
  Object.fromEntries(Object.entries(defaultValue).map(([key, value]) => [key, new BS(value)])) as {
    [K in keyof A]: BS<A[K]>;
  };

export type Behavior<A> = {
  default: A;
  latest: r.Observable<A>;
};
export const behavior = <A>(behavior: BS<A>): Behavior<A> => ({
  default: behavior.getValue(),
  latest: behavior.pipe(ro.skip(1)),
});

export const applyNext = <A>(subj: r.Subject<A>, item: A): void => subj.next(item);

export const arrayEq = <A>(
  arrays: BS<A[]>,
  actions: r.Observable<SafeDOMAction<A>> = r.EMPTY,
  eq: Eq.Eq<A> = Eq.eqStrict
): r.Observable<SafeDOMAction<A>> => {
  const preventEmit = new BS<number>(0);

  return r.merge(
    arrays.pipe(
      ro.filter(() => {
        if (0 < preventEmit.getValue()) {
          preventEmit.next(preventEmit.getValue() - 1);
          return false;
        }
        return true;
      }),
      ro.bufferCount(2),
      ro.mergeMap(([prev, current]) => r.from(arrayDiffEq(prev, current, eq))),
      ro.finalize(() => preventEmit.complete())
    ),
    actions.pipe(
      ro.tap(() => preventEmit.next(preventEmit.getValue() + 1)),
      ro.tap((r) => arrays.next(applyAction(arrays.getValue(), r)))
    )
  );
};
