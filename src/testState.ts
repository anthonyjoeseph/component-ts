import * as r from "rxjs";
import * as C from "./lib/state/cursor";
import * as O from "./lib/state/observableState";
import * as Comp from "./lib/state/compare";
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

const atThree = pipe(C.id<TestState>(), C.prop("two"), C.prop("three"));
const chg = O.change({ cursor: atThree, modify: (s) => s.toUpperCase() });

const state = O.eqState(
  defaultState,
  r.of(chg),
  Comp.struct({ one: Comp.number, two: Comp.struct({ three: Comp.string }) })
);

const threeListen = O.obsCursor(atThree, state);
