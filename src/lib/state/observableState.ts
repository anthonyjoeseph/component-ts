import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { Cursor, containsCursor } from "./cursor";
import { Compare, compareAt } from "./compare";

/**
 * 
  - if it's beneath me in the tree
    - emit
  - if it's above me in the tree
    - check if my value has changed
    - if so, emit
 */
export const obsCursor = <State, Focus>(curs: Cursor<State, Focus>, eqState: EqState<State>): r.Observable<Focus> =>
  eqState.changes.pipe(
    ro.filter((cursor) => containsCursor(cursor, curs as Cursor<State, unknown>)),
    ro.map(() => curs.get(eqState.get()))
  );

export const eqState = <State>(
  defaultState: State,
  modify$: r.Observable<Change<State, unknown>>,
  compare: Compare<State>
): EqState<State> => {
  let state = defaultState;
  return {
    get: () => state,
    compare,
    changes: modify$.pipe(
      ro.map((r) => ({ cursor: r.cursor, newVal: r.modify(r.cursor.get(state)) })),
      ro.mergeMap(({ cursor, newVal }) => r.from(compareAt(compare, cursor).compare(cursor.get(state), newVal))),
      ro.tap(({ cursor, newVal }) => {
        state = cursor.set(() => newVal)(state) as State;
      }),
      ro.map((r) => r.cursor as Cursor<State, unknown>)
    ),
  };
};

export type EqState<State> = {
  get: () => State;
  compare: Compare<State>;
  changes: r.Observable<Cursor<State, unknown>>;
};

export type Change<State, Focus> = { cursor: Cursor<State, Focus>; modify: (a: Focus) => Focus };
export const change = <State, Focus>(s: Change<State, Focus>): Change<State, unknown> => s as Change<State, unknown>;
