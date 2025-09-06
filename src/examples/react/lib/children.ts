import { createElement, Fragment } from "react";
import { ComponentEvents, ComponentInput, component as e, inputComponent as ie, RxComponent } from "./component";
import { omit } from "lodash";
import { FastAnd, FastUnionToIntersection } from "./util";

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

export const keyChildren = <
  ParentInput extends any,
  ParentEvents,
  // keep ChildKeys separate b/c it allows inference
  ChildKeys extends string[],
  Children extends { [K in keyof ChildKeys]: [ChildKeys[K], RxComponent<any, any>] },
>(
  parent: RxComponent<ParentInput, ParentEvents>,
  ...children: Children
): RxComponent<
  FastAnd<ParentInput, AllInputs<ChildKeys, Children>>,
  FastAnd<ParentEvents, AllEvents<ChildKeys, Children>>
> => {
  return (input) => {
    const childKeys = children.map(([key]) => key);
    const parentInputs = omit(input, childKeys);

    const childNodesAndEvents = children.map(([key, childComponent]) => {
      return [key, childComponent((input as never)[key] ?? {})] as const;
    });
    const childNodes = childNodesAndEvents.map(([key, [node]]) => {
      if (node != null && typeof node === "object" && "props" in node) {
        return { ...node, key };
      }
      return node;
    });
    const childEvents = Object.fromEntries(childNodesAndEvents.map(([key, [, events]]) => [key, events]));

    const [parentNode, parentEvents] = parent(parentInputs as never);
    const parentNodeWithChildren =
      parentNode != null && typeof parentNode === "object" && "props" in parentNode
        ? {
            ...parentNode,
            props: {
              ...parentNode.props,
              children: childNodes,
            },
          }
        : parentNode;

    const allEvents = { ...parentEvents, ...childEvents };
    return [parentNodeWithChildren, allEvents as never];
  };
};

export const mergeChildren = <ParentInput, ParentEvents, Children extends RxComponent<any, any>[]>(
  parent: RxComponent<ParentInput, ParentEvents>,
  children: Children
): RxComponent<
  FastUnionToIntersection<ParentInput | ComponentInput<Children[number]>>,
  FastUnionToIntersection<ParentEvents | ComponentEvents<Children[number]>>
> => {
  return (input) => {
    const childNodesAndEvents = children.map((childComponent) => {
      return childComponent(input as never);
    });
    const childNodes = childNodesAndEvents.map(([node]) => {
      if (node != null && typeof node === "object" && "props" in node) {
        return { ...node };
      }
      return node;
    });
    const childEvents = childNodesAndEvents.reduce((acc, [, childEvents]) => ({ ...acc, ...childEvents }), {});

    const [parentNode, parentEvents] = parent(input as never);
    const parentNodeWithChildren =
      parentNode != null && typeof parentNode === "object" && "props" in parentNode
        ? {
            ...parentNode,
            props: {
              ...parentNode.props,
              children: childNodes,
            },
          }
        : parentNode;

    const allEvents = { ...parentEvents, ...childEvents };
    return [parentNodeWithChildren, allEvents as never];
  };
};

export const simpleChildren = <ParentInput, ParentEvents>(
  parent: RxComponent<ParentInput, ParentEvents>,
  children: RxComponent<{}, null>[]
): RxComponent<ParentInput, ParentEvents> => {
  return (input) => {
    const childNodes = children.map((child) => child({})[0]);
    const [parentNode, parentEvents] = parent(input as never);
    const parentNodeWithChildren =
      parentNode != null && typeof parentNode === "object" && "props" in parentNode
        ? {
            ...parentNode,
            props: {
              ...parentNode.props,
              children: childNodes,
            },
          }
        : parentNode;

    const allEvents = { ...parentEvents };
    return [parentNodeWithChildren, allEvents as never];
  };
};
