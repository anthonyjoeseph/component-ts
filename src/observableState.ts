import * as r from "rxjs";
import * as ro from "rxjs/operators";
import * as Eq from "fp-ts/Eq";

export const observableState = <A>(
  defaultState: A,
  modify$: r.Observable<(newState: A) => A>,
  eq: Eq.Eq<A>
): {
  getValue: () => A;
  changes: r.Observable<A>;
} => {
  let state = defaultState;
  return {
    getValue: () => state,
    changes: modify$.pipe(
      ro.map((fn) => fn(state)),
      ro.filter((newState) => !eq.equals(newState, state)),
      ro.tap((newState) => {
        state = newState;
      })
    ),
  };
};
