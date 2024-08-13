import * as r from "rxjs";
import * as C from "./lib/state/cursor";
import * as O from "./lib/state/observableState";
import { pipe } from "fp-ts/function";

type TestState = {
  one: number;
  two: {
    three: string;
  };
};
const defaultState: TestState = {
  one: 1,
  two: { three: "it says 'three'" },
};

const atThree = pipe(C.id<TestState>(), C.prop("two"));
const chg = O.change({ cursor: pipe(atThree, C.prop("three")), modify: (s) => s.toUpperCase() });

const state = O.eqState(defaultState, r.of(chg), []);

const threeListen = O.obsCursor(atThree, state);
