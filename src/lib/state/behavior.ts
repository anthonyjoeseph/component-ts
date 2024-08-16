import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { pipe } from "fp-ts/function";
import * as Eq from "fp-ts/Eq";

import BS = r.BehaviorSubject;
import { SafeDOMAction } from "./array/DOMAction";

export const distinctUntilChanged = ro.distinctUntilChanged;

export type BehaviorSubjectLike<A> = r.Observable<A> & {
  getValue: () => A;
  next: (a: A) => void;
};

const a: BehaviorSubjectLike<number> = new BS(3);

export const struct = <A>(subjs: {
  [K in keyof A]: BehaviorSubjectLike<A[K]>;
}): BehaviorSubjectLike<A> => {
  const getValue = () =>
    Object.fromEntries(
      Object.entries(subjs as Record<string, BS<unknown>>).map(([key, subj]) => [key, subj.getValue()] as const)
    ) as A;
  const next = (newVal: A) => {
    allowEmit.next(false);
    Object.entries(subjs).map(([key, subj]) => (subj as BS<unknown>).next((newVal as Record<string, unknown>)[key]));
  };
  const allowEmit = new BS<boolean>(true);
  const obs = r.merge(
    ...Object.entries(subjs).map(([key, subj]) =>
      (subj as r.Observable<unknown>).pipe(
        ro.map(
          (v): A => ({
            ...getValue(),
            [key]: v,
          })
        ),
        ro.filter(() => allowEmit.getValue())
      )
    )
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

/**
 * Notes:
 * should be (b: BS<A[]> o: Observable<ArrayAction<A>>) => Observable<ArrayAction<A> | ArrayWarning<A>>
 *
 * _Should not return a subject_
 */
export const arrayEq = <A>(
  arrays: BS<A[]>,
  eq: Eq.Eq<A> = Eq.eqStrict,
  actions: r.Observable<SafeDOMAction<A>>
): r.Observable<SafeDOMAction<A>> => {
  const allowEmit = new BS<boolean>(true);

  arrays.pipe(ro.bufferCount(2)).subscribe(([prev, current]) => {
    arrayDiff(prev, current, uniqueKey).forEach((action) => middleman.next({ type: "action", action }));
  });
  actions.subscribe((action) => {
    const newArray = modifyArray(arrays.getValue(), action);
    if (newArray._tag === "Some") middleman.next({ type: "array", array: newArray.value });
  });
  return actions;
};
