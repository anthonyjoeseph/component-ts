import { Observable } from "rxjs";

export const addProp = <Prop extends string, A extends Record<string, unknown>>(
  prop: Prop,
  a: A
): {
  [K in keyof A]: { [P in Prop]: A[K] };
} => {
  return Object.fromEntries(Object.entries(a).map(([key, value]) => [key, { [prop]: value }] as const)) as {
    [K in keyof A]: { [P in Prop]: A[K] };
  };
};

export const removeProp = <Prop extends string, A extends Record<string, { [P in Prop]: unknown }>>(
  prop: Prop,
  a: A
): {
  [K in keyof A]: A[K][Prop];
} => {
  return Object.fromEntries(
    Object.entries(a).map(([key, value]) => [key, (value as { [P in Prop]: unknown })[prop]] as const)
  ) as {
    [K in keyof A]: A[K][Prop];
  };
};

export const apply = <A extends Record<string, (arg: any) => unknown>>(
  a: A,
  args: {
    [K in keyof A]: Parameters<A[K]>[0];
  }
): {
  [K in keyof A]: ReturnType<A[K]>;
} => {
  return Object.fromEntries(Object.entries(a).map(([key, value]) => [key, value(args[key])] as const)) as {
    [K in keyof A]: ReturnType<A[K]>;
  };
};

export const fromKeys = <Keys extends string[], Value>(
  keys: Keys,
  value: Value
): {
  [K in Keys[number]]: Value;
} => {
  return null;
};

export const withLatestFrom = <ParentType, Children extends Record<string, Observable<unknown>>>(
  parent: Observable<ParentType>,
  children: Children
): Observable<
  [
    ParentType,
    {
      [K in keyof Children]: Children[K] extends Observable<infer ChildType> ? ChildType : never;
    },
  ]
> => {
  return null;
};

const fns = {
  stringify: (a: number) => String(a),
  numberify: (b: string) => parseInt(b),
};

const test = apply(fns, {
  numberify: "123",
  stringify: 123,
});
