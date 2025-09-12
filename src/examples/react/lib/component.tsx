import { FC, type ReactNode, createElement, useEffect, useRef } from "react";
import { type Observable, Subject, filter, map, EMPTY, isObservable } from "rxjs";
import { useObservableState } from "observable-hooks";
import pick from "lodash/pick";
import { ShallowAnd } from "./util";

export type RxComponent<Input extends Record<string, unknown>, Events extends Record<string, unknown>> = [
  Events,
  InputFn<Input>,
];

export type ComponentInput<C extends RxComponent<any, any>> = Parameters<C[1]["getNode"]>[0];

export type ComponentEvents<C extends RxComponent<any, any>> = C[0];

export type InputFn<Input> = { inputKeys: (keyof Input)[]; getNode: (input: Input) => ReactNode };

export const contramapInputs = <
  OldInput extends Record<string, unknown>,
  Events extends Record<string, unknown>,
  NewInputKeys extends string[],
  NewInput extends Record<NewInputKeys[number], unknown>,
>(
  component: RxComponent<OldInput, Events>,
  newInputKeys: NewInputKeys,
  fn: (inputs: NewInput, oldInputKeys: (keyof OldInput)[]) => OldInput
): RxComponent<NewInput, Events> => {
  const [events, { getNode, inputKeys: oldInputKeys }] = component;
  return [
    events,
    {
      getNode: (newInput) => {
        return getNode(fn(newInput, oldInputKeys));
      },
      inputKeys: newInputKeys,
    },
  ];
};

export const mapEvents = <
  Input extends Record<string, unknown>,
  OldEvents extends Record<string, unknown>,
  NewEvents extends Record<string, unknown>,
>(
  component: RxComponent<Input, OldEvents>,
  fn: (events: OldEvents, inputKeys: (keyof Input)[]) => NewEvents
): RxComponent<Input, NewEvents> => {
  const [events, inputFn] = component;
  return [fn(events, inputFn.inputKeys), inputFn];
};

export type GetInputs<Tag extends keyof JSX.IntrinsicElements, Keys extends Array<keyof JSX.IntrinsicElements[Tag]>> = {
  [K in Keys[number]]: Observable<JSX.IntrinsicElements[Tag][K]>;
};

export type GetOutputs<
  Tag extends keyof JSX.IntrinsicElements,
  Keys extends Array<keyof JSX.IntrinsicElements[Tag]>,
> = {
  [K in Keys[number]]: NonNullable<JSX.IntrinsicElements[Tag][K]> extends React.ReactEventHandler<any>
    ? Observable<Parameters<NonNullable<JSX.IntrinsicElements[Tag][K]>>[0]>
    : K extends "ref"
      ? () => JSX.IntrinsicElements[Tag]
      : never;
};

export type ComponentFn = {
  <
    Tag extends keyof JSX.IntrinsicElements,
    InputKeys extends Array<keyof JSX.IntrinsicElements[Tag]>,
    OutputKeys extends Array<keyof JSX.IntrinsicElements[Tag] | "ref">,
    Child extends RxComponent<any, any>,
  >(
    tag: Tag,
    dynamicInputs: InputKeys,
    outputs: OutputKeys,
    staticInputs: JSX.IntrinsicElements[Tag],
    child: Child
  ): RxComponent<
    ShallowAnd<{ [K in InputKeys[number]]-?: Observable<JSX.IntrinsicElements[Tag][K]> }, ComponentInput<Child>>,
    ShallowAnd<GetOutputs<Tag, OutputKeys>, ComponentEvents<Child>>
  >;

  <
    Tag extends keyof JSX.IntrinsicElements,
    InputKeys extends Array<keyof JSX.IntrinsicElements[Tag]>,
    OutputKeys extends Array<keyof JSX.IntrinsicElements[Tag] | "ref">,
    Child extends RxComponent<any, any>,
  >(
    tag: Tag,
    dynamicInputs: InputKeys,
    outputs: OutputKeys,
    child: Child
  ): RxComponent<
    ShallowAnd<{ [K in InputKeys[number]]-?: Observable<JSX.IntrinsicElements[Tag][K]> }, ComponentInput<Child>>,
    ShallowAnd<GetOutputs<Tag, OutputKeys>, ComponentEvents<Child>>
  >;

  <
    Tag extends keyof JSX.IntrinsicElements,
    InputKeys extends Array<keyof JSX.IntrinsicElements[Tag]>,
    Child extends RxComponent<any, any>,
  >(
    tag: Tag,
    dynamicInputs: InputKeys,
    staticInputs: JSX.IntrinsicElements[Tag],
    child: Child
  ): RxComponent<
    ShallowAnd<{ [K in InputKeys[number]]-?: Observable<JSX.IntrinsicElements[Tag][K]> }, ComponentInput<Child>>,
    ComponentEvents<Child>
  >;

  <
    Tag extends keyof JSX.IntrinsicElements,
    InputKeys extends Array<keyof JSX.IntrinsicElements[Tag]>,
    Child extends RxComponent<any, any>,
  >(
    tag: Tag,
    dynamicInputs: InputKeys,
    child: Child
  ): RxComponent<
    ShallowAnd<{ [K in InputKeys[number]]-?: Observable<JSX.IntrinsicElements[Tag][K]> }, ComponentInput<Child>>,
    ComponentEvents<Child>
  >;

  <Tag extends keyof JSX.IntrinsicElements, Child extends RxComponent<any, any>>(
    tag: Tag,
    staticInputs: JSX.IntrinsicElements[Tag],
    child: Child
  ): RxComponent<ComponentInput<Child>, ComponentEvents<Child>>;

  <Tag extends keyof JSX.IntrinsicElements, Child extends RxComponent<any, any>>(
    tag: Tag,
    child: Child
  ): RxComponent<ComponentInput<Child>, ComponentEvents<Child>>;

  <
    Tag extends keyof JSX.IntrinsicElements,
    InputKeys extends Array<keyof JSX.IntrinsicElements[Tag]>,
    OutputKeys extends Array<keyof JSX.IntrinsicElements[Tag] | "ref">,
  >(
    tag: Tag,
    dynamicInputs: InputKeys,
    outputs: OutputKeys,
    staticInputs?: JSX.IntrinsicElements[Tag]
  ): RxComponent<
    { [K in InputKeys[number]]-?: Observable<JSX.IntrinsicElements[Tag][K]> },
    GetOutputs<Tag, OutputKeys>
  >;

  <Tag extends keyof JSX.IntrinsicElements, InputKeys extends Array<keyof JSX.IntrinsicElements[Tag]>>(
    tag: Tag,
    dynamicInputs: InputKeys,
    staticInputs?: JSX.IntrinsicElements[Tag]
  ): RxComponent<{ [K in InputKeys[number]]-?: Observable<JSX.IntrinsicElements[Tag][K]> }, {}>;

  <Tag extends keyof JSX.IntrinsicElements>(tag: Tag, staticInputs?: JSX.IntrinsicElements[Tag]): RxComponent<{}, {}>;
};

const f = <form action="eee"></form>;

export const component: ComponentFn = (
  tag: string,
  secondArg?: string[] | Record<string, unknown> | [Record<string, unknown>, InputFn<unknown>],
  thirdArg?: string[] | Record<string, unknown> | [Record<string, unknown>, InputFn<unknown>],
  fourthArg?: Record<string, unknown> | [Record<string, unknown>, InputFn<unknown>],
  fifthArg?: [Record<string, unknown>, InputFn<unknown>]
) => {
  const typeOfArg = (a: unknown): "KeyArray" | "Component" | "StaticInputs" =>
    Array.isArray(a) ? (typeof a[0] === "string" ? "KeyArray" : "Component") : "StaticInputs";
  const childComponent = [fifthArg, fourthArg, thirdArg, secondArg].find((arg) => typeOfArg(arg) === "Component") as
    | [unknown, InputFn<unknown>]
    | undefined;
  const staticInputs = [fourthArg, thirdArg, secondArg].find((arg) => typeOfArg(arg) === "StaticInputs") as
    | Record<string, unknown>
    | undefined;
  const outputKeys = (typeOfArg(thirdArg) === "KeyArray" ? thirdArg : []) as string[];
  const dynamicInputKeys = (typeOfArg(secondArg) === "KeyArray" ? secondArg : []) as string[];

  const childEvents = childComponent?.[0];
  const childInputkeys = childComponent?.[1]?.inputKeys ?? [];
  const getChildNode = childComponent?.[1]?.getNode;

  const eventHandler = outputKeys.some((o) => o !== "ref") ? new Subject<[string, unknown]>() : undefined;
  let outerRef: React.RefObject<HTMLInputElement> | undefined;

  const events = Object.fromEntries(
    outputKeys
      .filter((outputKey) => outputKey !== "ref")
      .map((outputKey): [string, unknown] => {
        return [
          outputKey as string,
          eventHandler?.pipe(
            filter(([key]) => key === outputKey),
            map(([, value]) => value)
          ) ?? EMPTY,
        ];
      })
  );

  const eventsPlusRef = Array.isArray(secondArg)
    ? ({
        ...events,
        ...(outputKeys.includes("ref")
          ? {
              ref: () => {
                return outerRef?.current;
              },
            }
          : {}),
      } as never)
    : {};
  const getNode = (rawDynamicInputs?: Record<string, unknown>) => {
    const dynamicInputs = pick(rawDynamicInputs, dynamicInputKeys);
    // do it inside a function element to make sure the hooks work
    // 'children' is a prop so that our children() fn can pass them in for free
    const Element: FC = ({ children: propChildren }: { children?: ReactNode }) => {
      outerRef = outputKeys.includes("ref") ? useRef<HTMLInputElement>(null) : undefined;
      useEffect(() => {
        // on un-mount
        return () => {
          if (eventHandler !== undefined) {
            eventHandler.complete();
          }
        };
      }, []);
      const curatedProps: Record<string, unknown> = {};
      for (const [propName, propVal] of Object.entries(staticInputs ?? {})) {
        curatedProps[propName] = propVal;
      }
      for (const [propName, propVal] of Object.entries(dynamicInputs ?? {})) {
        if (isObservable(propVal as Observable<unknown>)) {
          curatedProps[propName] = useObservableState(propVal as Observable<unknown>, (staticInputs ?? {})[propName]);
        }
      }
      for (const outputKey of outputKeys) {
        if (outputKey !== "ref") {
          curatedProps[outputKey as string] = (event: unknown) => eventHandler?.next([outputKey as string, event]);
        }
      }

      const children = getChildNode ? getChildNode(rawDynamicInputs) : (curatedProps.children ?? propChildren);

      const returnElm = createElement(tag, {
        ...curatedProps,
        ref: outerRef,
        children,
      });
      return returnElm;
    };
    return <Element />;
  };
  return [
    { ...eventsPlusRef, ...(childEvents ?? {}) },
    { getNode, inputKeys: [...dynamicInputKeys, ...childInputkeys] },
  ] as [never, InputFn<unknown>];
};
