import * as C from "./cursor";

export type Compare<A> = {
  compare: (oldVal: A, newVal: A) => { cursor: C.Cursor<A, any>; newVal: any }[];
  children?: {
    [K in keyof A]: Compare<A[K]>;
  };
};

export const string: Compare<string> = {
  compare: (oldVal, newVal) => (oldVal === newVal ? [] : [{ cursor: C.id<string>() as C.Cursor<string, any>, newVal }]),
};

export const number: Compare<number> = {
  compare: (oldVal, newVal) => (oldVal === newVal ? [] : [{ cursor: C.id<number>() as C.Cursor<number, any>, newVal }]),
};

export const struct = <A extends Record<string, unknown>>(children: {
  [K in keyof A]: Compare<A[K]>;
}): Compare<A> => ({
  compare: (oldVal, newVal) =>
    Object.entries(children).flatMap(([key, comparer]: [string, Compare<any>]) =>
      comparer
        .compare(oldVal[key], newVal[key])
        .map(({ cursor, newVal }) => ({ cursor: C.prop(key as never)(cursor) as any, newVal }))
    ),
  children,
});

export const compareAt = <A, Focus>(compare: Compare<A>, cursor: C.Cursor<A, Focus>): Compare<Focus> => {
  let currentChild: any = compare;
  for (const segment of cursor.path) {
    currentChild = (compare.children as any)[segment];
  }
  return currentChild as Compare<Focus>;
};
