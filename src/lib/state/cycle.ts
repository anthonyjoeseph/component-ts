import { Observable, defer, isObservable } from "rxjs";
import { RxNode } from "../node/actions";

export type ShallowDefer<A> =
  A extends Observable<infer O>
    ? () => Observable<O>
    : A extends Record<string, unknown>
      ? {
          [K in keyof A]: ShallowDefer<A[K]>;
        }
      : never;

export const cycle = <Input, Output extends object>(
  component: (input: Input) => [RxNode, Output],
  program: (output: ShallowDefer<Output>) => Input
): [RxNode, Output] => {
  let eventualOutput: Output;
  const recurse = (path: string[]) =>
    new Proxy<ShallowDefer<Output>>({} as unknown as ShallowDefer<Output>, {
      get: (_target, property, _receiver) => {
        return recurse([...path, property as string]);
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
