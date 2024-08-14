export type Cursor<State, Focus> = {
  path: string[];
  get: (s: State) => Focus;
  set: (modify: (f: Focus) => Focus) => (s: State) => State;
};

export const containsCursor = <State>(superset: Cursor<State, unknown>, subset: Cursor<State, unknown>): boolean => {
  const sliced = superset.path.slice(0, subset.path.length);
  for (let i = 0; i < sliced.length; i++) {
    if (sliced[i] !== subset.path[i]) return false;
  }
  return true;
};

export const id = <State>(): Cursor<State, State> => ({
  path: [],
  get: (s) => s,
  set: () => (s) => s,
});

export const prop =
  <State, Focus, Prop extends keyof Focus>(prop: Prop) =>
  (cursor: Cursor<State, Focus>): Cursor<State, Focus[Prop]> => ({
    path: [...cursor.path, prop as string],
    get: (s) => cursor.get(s)[prop],
    set: (modify) => (s) => Object.assign({}, s, { [prop]: modify(cursor.get(s)[prop]) }),
  });

type ValueAtPath<Obj, Cursor> = Cursor extends readonly [infer Head extends keyof Obj, ...infer Rest]
  ? ValueAtPath<Obj[Head], Rest>
  : Obj;

type TestState = {
  one: number;
  two: {
    three: string;
  };
};

type test = ValueAtPath<TestState, ["two", "three"]>;
