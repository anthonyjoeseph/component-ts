import { ReactNode } from "react";
import { Observable, defer } from "rxjs";
import { ComponentEvents, ComponentInput, RxComponent } from "./component";

export type CycleModel<C extends RxComponent<any, any>, Output = null> = (events: ShallowDefer<ComponentEvents<C>>) => {
  input: ComponentInput<C>;
  output: Output;
};

export type ShallowDefer<A> =
  A extends Observable<infer O>
    ? () => Observable<O>
    : A extends Record<string, unknown>
      ? {
          [K in keyof A]: K extends "ref" ? A[K] : ShallowDefer<A[K]>;
        }
      : A extends (infer Arr)[]
        ? ShallowDefer<Arr>[]
        : never;

export const cycle = <Input, Events extends object, Output>(
  component: RxComponent<Input, Events>,
  program: (output: ShallowDefer<Events>) => { input: Input; output: Output }
): [ReactNode, Output] => {
  let deferredEvents: Events;
  const recurse = (path: string[]) =>
    new Proxy(() => {}, {
      get: (_target, property, _receiver) => {
        return recurse([...path, property as string]) as any;
      },
      apply: (_target, _thisArg, argArray) => {
        if (path[path.length - 1] === "ref") {
          let obs: any = deferredEvents;
          for (const prop of path) {
            obs = obs[prop];
          }
          return obs(...argArray);
        }
        return defer(() => {
          let obs: any = deferredEvents;
          for (const prop of path) {
            obs = obs[prop];
          }
          return obs;
        });
      },
    });

  let programInput = recurse([]) as never;
  const runProgram = program(programInput);
  const [node, events] = component(runProgram.input);
  deferredEvents = events;
  return [node, runProgram.output] as [ReactNode, Output];
};
