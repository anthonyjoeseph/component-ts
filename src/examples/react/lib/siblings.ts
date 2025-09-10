import { createElement, Fragment, ReactNode } from "react";
import { component, ComponentEvents, ComponentInput, InputFn, RxComponent } from "./component";
import { ShallowUnionToIntersection } from "./util";

type HasKeys<A> = keyof A extends never ? false : true;

/**
 * As per https://stackoverflow.com/a/30919039 we can rely on Object.keys for
 * deterministic ordering, at least for ES2020 and beyond
 *
 * As of modern ECMAScript specification, `for/in` traversal order is well-defined and consistent across implementations - source: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in#description mdn}
 *
 * `Object.entries()` uses `for/in` ordering - source: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries#description mdn}
 */
export const keyedSiblings = <Siblings extends Record<string, RxComponent<any, any>>>(
  siblings: Siblings
): RxComponent<
  {
    [K in keyof Siblings as HasKeys<ComponentInput<Siblings[K]>> extends true ? K : never]: ComponentInput<Siblings[K]>;
  },
  {
    [K in keyof Siblings as HasKeys<ComponentEvents<Siblings[K]>> extends true ? K : never]: ComponentEvents<
      Siblings[K]
    >;
  }
> => {
  const entries = Object.entries(siblings);
  const events = Object.fromEntries(entries.map(([key, [events, _getNode]]) => [key, events]));
  const getNodeFns = entries.map(([key, [_event, getNode]]) => [key, getNode] as const);

  const getFragment = (input: unknown) => {
    const nodes = getNodeFns.map(([key, { getNode }]): ReactNode => {
      const inputFromKey = (input as never)[key];
      const node = getNode(inputFromKey);
      return node != null && typeof node === "object" && "props" in node ? { ...node, key } : node;
    });
    return createElement(Fragment, { children: nodes });
  };

  return [
    events as any,
    {
      getNode: getFragment,
      inputKeys: entries.map(([key]) => key),
    } as InputFn<unknown>,
  ];
};

export const mergeSiblings = <Children extends RxComponent<any, any>[]>(
  ...siblings: Children
): RxComponent<
  ShallowUnionToIntersection<ComponentInput<Children[number]>>,
  ShallowUnionToIntersection<ComponentEvents<Children[number]>>
> => {
  const events = siblings.reduce((acc, [event, _getNode]) => ({ ...acc, ...event }), {});
  const getNodeFns = siblings.map(([_event, getNode]) => getNode);

  const getFragment = (input: ShallowUnionToIntersection<ComponentInput<Children[number]>>) => {
    const nodes = getNodeFns.map(({ getNode }, index): ReactNode => {
      const node = getNode(input as never);
      return node != null && typeof node === "object" && "props" in node ? { ...node, key: String(index) } : node;
    });
    return createElement(Fragment, { children: nodes });
  };

  return [
    events as ShallowUnionToIntersection<ComponentEvents<Children[number]>>,
    {
      getNode: getFragment,
      inputKeys: siblings.flatMap(([events]) => Object.keys(events)),
    } as InputFn<ShallowUnionToIntersection<ComponentInput<Children[number]>>>,
  ];
};

export const simpleSiblings: (...siblings: RxComponent<{}, {}>[]) => RxComponent<{}, {}> = mergeSiblings;
