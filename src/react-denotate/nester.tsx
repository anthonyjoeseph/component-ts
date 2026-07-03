import {
  Component,
  FunctionComponent,
  ReactNode,
  ReactElement,
  ComponentProps,
  JSXElementConstructor,
} from "react";

export type Flatten<A> = {
  [K in keyof A]: A[K];
};

export type UnionToIntersection<T> = (
  T extends any ? (x: T) => any : never
) extends (x: infer R) => any
  ? R
  : never;

export const element = <Children extends JSXElementConstructor<any>[]>(
  el: ReactElement,
  children: Children,
): FunctionComponent<
  UnionToIntersection<
    Children[number] extends any ? ComponentProps<Children[number]> : never
  >
> => null;

export const component = <
  Parent extends JSXElementConstructor<any>,
  Children extends JSXElementConstructor<any>[],
>(
  parent: Parent,
  children: Children,
): FunctionComponent<
  ComponentProps<Parent> &
    UnionToIntersection<
      Children[number] extends any ? ComponentProps<Children[number]> : never
    >
> => null;

export const name = <
  Name extends string,
  Parent extends JSXElementConstructor<any>,
>(
  name: Name,
  parent: Parent,
): FunctionComponent<{ [K in Name]: ComponentProps<Parent> }> => null;

export const e = element;
export const c = component;
export const n = name;

declare const TestCompA: FunctionComponent<{ a: number }>;
declare const TestCompB: FunctionComponent<{ b: string }>;
declare const TestCompC: FunctionComponent<{ c: boolean }>;

const testElement = element(<a />, [TestCompA, TestCompB]);

const testComponent = component(TestCompA, [TestCompB, TestCompC]);

const testName = name("theTest", TestCompA);

const testAll = e(<div />, [n("a", TestCompA), TestCompB]);
