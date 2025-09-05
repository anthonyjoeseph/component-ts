import { createElement, type ReactNode, Fragment } from "react";
import { pick, omit } from "lodash";
import { Observable } from "rxjs";
import * as r from "rxjs";
import { ShallowDefer } from "./cycle";

export type RxComponent<Input, Events> = (p: Input) => [ReactNode, Events];

export type ComponentInput<C extends RxComponent<any, any>> = Parameters<C>[0];

export type ComponentEvents<C extends RxComponent<any, any>> = ReturnType<C>[1];

export type CycleModel<C extends RxComponent<any, any>> = (
  events: ShallowDefer<ComponentEvents<C>>
) => ComponentInput<C>;

export const map = <Input, Events>(
  component: RxComponent<Input, Events>,
  getKey: (input: Input) => string
): RxComponent<Input[], Events[]> => {
  return (inputs) => {
    const all = inputs.map((input) => {
      const [node, events] = component(input);
      if (node != null && typeof node === "object" && "props" in node) {
        return [{ ...node, key: getKey(input) }, events] as const;
      }
      return [node, events] as const;
    });
    return [
      createElement(Fragment, {
        children: all.map(([node]) => node),
      }),
      all.map(([, events]) => events),
    ];
  };
};

export type AllInputs<
  P,
  ChildKeys extends string[],
  C extends { [K in keyof ChildKeys]: [ChildKeys[K], RxComponent<any, any>] },
> = {
  [K in keyof P | Extract<C[number], [string, RxComponent<any, any>]>[0]]: K extends keyof P
    ? P[K]
    : ComponentInput<Extract<C[number], [K, RxComponent<any, any>]>[1]>;
};
export type AllEvents<
  P,
  ChildKeys extends string[],
  C extends { [K in keyof ChildKeys]: [ChildKeys[K], RxComponent<any, any>] },
> = {
  [K in keyof P | Extract<C[number], [string, RxComponent<any, any>]>[0]]: K extends keyof P
    ? P[K]
    : ComponentEvents<Extract<C[number], [K, RxComponent<any, any>]>[1]>;
};

export const children = <
  ParentInput,
  ParentEvents,
  // keep ChildKeys separate b/c it allows inference
  ChildKeys extends string[],
  Children extends { [K in keyof ChildKeys]: [ChildKeys[K], RxComponent<any, any>] },
>(
  parent: RxComponent<ParentInput, ParentEvents>,
  ...children: Children
): RxComponent<AllInputs<ParentInput, ChildKeys, Children>, AllEvents<ParentEvents, ChildKeys, Children>> => {
  return (input) => {
    const childKeys = children.map(([key]) => key);
    const parentInputs = omit(input, childKeys);

    const childNodesAndEvents = children.map(
      ([key, childComponent]) => [key, childComponent((input as never)[key])] as const
    );
    const childNodes = childNodesAndEvents.map(([key, [node]]) => {
      if (node != null && typeof node === "object" && "props" in node) {
        return { ...node, key };
      }
      return node;
    });
    const childEvents = Object.fromEntries(childNodesAndEvents.map(([key, [, events]]) => [key, events]));

    const [parentNode, parentEvents] = parent({ ...parentInputs, children: childNodes } as any);
    const allEvents = { ...parentEvents, ...childEvents };
    return [parentNode, allEvents as any];
  };
};
