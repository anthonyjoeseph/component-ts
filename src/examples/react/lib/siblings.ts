import { createElement, Fragment, ReactNode } from "react";
import { ComponentEvents, ComponentInput, InputFn, RxComponent } from "./component";
import { FastAnd, FastUnionToIntersection } from "./util";

export type AllInputs<
  ChildKeys extends string[],
  C extends { [K in keyof ChildKeys]: [ChildKeys[K], RxComponent<any, any>] },
> = {
  [K in Extract<C[number], [string, RxComponent<any, any>]>[0] as keyof ComponentInput<
    Extract<C[number], [K, RxComponent<any, any>]>[1]
  > extends never
    ? never
    : K]: ComponentInput<Extract<C[number], [K, RxComponent<any, any>]>[1]>;
};
export type AllEvents<
  ChildKeys extends string[],
  C extends { [K in keyof ChildKeys]: [ChildKeys[K], RxComponent<any, any>] },
> = {
  [K in Extract<C[number], [string, RxComponent<any, any>]>[0] as keyof ComponentEvents<
    Extract<C[number], [K, RxComponent<any, any>]>[1]
  > extends never
    ? never
    : K]: ComponentEvents<Extract<C[number], [K, RxComponent<any, any>]>[1]>;
};

export const keyedSiblings = <
  // keep Keys separate b/c it allows inference
  Keys extends string[],
  Siblings extends { [K in keyof Keys]: [Keys[K], RxComponent<any, any>] },
>(
  ...siblings: Siblings
): RxComponent<AllInputs<Keys, Siblings>, AllEvents<Keys, Siblings>> => {
  const events = Object.fromEntries(siblings.map(([key, [event, _getNode]]) => [key, event]));
  const getNodeFns = siblings.map(([key, [_event, getNode]]) => [key, getNode] as const);

  const getFragment = (input: AllInputs<Keys, Siblings>) => {
    const nodes = getNodeFns.map(([key, { getNode }]): ReactNode => {
      const inputFromKey = (input as never)[key];
      const node = getNode(inputFromKey);
      return node != null && typeof node === "object" && "props" in node ? { ...node, key } : node;
    });
    return createElement(Fragment, { children: nodes });
  };

  return [
    events as AllEvents<Keys, Siblings>,
    {
      getNode: getFragment,
      inputKeys: siblings.map(([key]) => key),
    } as InputFn<AllInputs<Keys, Siblings>>,
  ];
};

export const mergeSiblings = <Children extends RxComponent<any, any>[]>(
  ...siblings: Children
): RxComponent<
  FastUnionToIntersection<ComponentInput<Children[number]>>,
  FastUnionToIntersection<ComponentEvents<Children[number]>>
> => {
  const events = siblings.reduce((acc, [event, _getNode]) => ({ ...acc, ...event }), {});
  const getNodeFns = siblings.map(([_event, getNode]) => getNode);

  const getFragment = (input: FastUnionToIntersection<ComponentInput<Children[number]>>) => {
    const nodes = getNodeFns.map(({ getNode }, index): ReactNode => {
      const node = getNode(input as never);
      return node != null && typeof node === "object" && "props" in node ? { ...node, key: String(index) } : node;
    });
    return createElement(Fragment, { children: nodes });
  };

  return [
    events as FastUnionToIntersection<ComponentEvents<Children[number]>>,
    {
      getNode: getFragment,
      inputKeys: siblings.flatMap(([events]) => Object.keys(events)),
    } as InputFn<FastUnionToIntersection<ComponentInput<Children[number]>>>,
  ];
};

export const simpleSiblings = (...siblings: RxComponent<{}, {}>[]): RxComponent<{}, {}> => {
  const a = mergeSiblings(...siblings);
  return a;
};
