import * as r from "rxjs";
import * as ro from "rxjs/operators";
import * as Eq from "fp-ts/Eq";
import { Cursor, containsCursor } from "./cursor";

export const obsCursor = <State, Focus>(curs: Cursor<State, Focus>, eqState: EqState<State>): r.Observable<Focus> =>
  eqState.changes.pipe(
    ro.filter((cursor) => containsCursor(cursor, curs as Cursor<State, unknown>)),
    ro.map(() => curs.get(eqState.get()))
  );

export const eqState = <State>(
  defaultState: State,
  modify$: r.Observable<Change<State, unknown>>,
  eqs: EqAt<State, unknown>[]
): EqState<State> => {
  let state = defaultState;
  return {
    get: () => state,
    eqs,
    changes: modify$.pipe(
      ro.map((r) => ({ cursor: r.cursor, newVal: r.modify(r.cursor.get(state)) })),
      ro.filter(
        (r) => !eqs.some((eq) => containsCursor(r.cursor, eq.cursor) && eq.eq.equals(r.newVal, r.cursor.get(state)))
      ),
      ro.tap((r) => {
        state = r.cursor.set(() => r.newVal)(state);
      }),
      ro.map((r) => r.cursor)
    ),
  };
};

export type EqState<State> = {
  get: () => State;
  eqs: EqAt<State, unknown>[];
  changes: r.Observable<Cursor<State, unknown>>;
};

export type Change<State, Focus> = { cursor: Cursor<State, Focus>; modify: (a: Focus) => Focus };
export const change = <State, Focus>(s: Change<State, Focus>): Change<State, unknown> => s as Change<State, unknown>;

export type EqAt<State, Focus> = { cursor: Cursor<State, Focus>; eq: Eq.Eq<Focus> };
export const eqAt = <State, Focus>(s: EqAt<State, Focus>): EqAt<State, Focus> => s as EqAt<State, Focus>;
