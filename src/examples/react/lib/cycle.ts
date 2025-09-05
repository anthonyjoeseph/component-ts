import { ReactNode } from "react";
import { Observable, defer } from "rxjs";

export type ShallowDefer<A> =
  A extends Observable<infer O>
    ? () => Observable<O>
    : A extends Record<string, unknown>
      ? {
          [K in keyof A]: ShallowDefer<A[K]>;
        }
      : A extends (infer Arr)[]
        ? ShallowDefer<Arr>[]
        : never;

export const cycle = <Input, Output extends object>(
  component: (input: Input) => [ReactNode, Output],
  program: (output: ShallowDefer<Output>) => Input
): [ReactNode, Output] => {
  let eventualOutput: Output;
  const recurse = (path: string[]) =>
    new Proxy<ShallowDefer<Output>>((() => {}) as unknown as ShallowDefer<Output>, {
      get: (target, property, _receiver) => {
        return recurse([...path, property as string]) as any;
      },
      apply: (_target, _thisArg, _argArray) => {
        return defer(() => {
          let obs: any = eventualOutput;
          for (const prop of path) {
            obs = obs[prop];
          }
          return obs;
        });
      },
    });
  const retval = component(program(recurse([])));
  eventualOutput = retval[1];
  return retval;
};
