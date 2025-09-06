import { FC, type ReactNode, createElement, useRef } from "react";
import { type Observable, Subject, filter, map, EMPTY } from "rxjs";
import { useObservableState } from "observable-hooks";

export type RxComponent<Input, Events> = (p: Input) => [ReactNode, Events];

export type ComponentInput<C extends RxComponent<any, any>> = Parameters<C>[0];

export type ComponentEvents<C extends RxComponent<any, any>> = ReturnType<C>[1];

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

export const inputComponent: {
  <Tag extends keyof JSX.IntrinsicElements, OutputKeys extends Array<keyof JSX.IntrinsicElements[Tag] | "ref">>(
    tag: Tag,
    outputs: OutputKeys,
    inputs?: JSX.IntrinsicElements[Tag]
  ): <A extends keyof JSX.IntrinsicElements[Tag] = never>(inputs: {
    [K in A]-?: Observable<JSX.IntrinsicElements[Tag][K]>;
  }) => [ReactNode, GetOutputs<Tag, OutputKeys>];

  <Tag extends keyof JSX.IntrinsicElements>(
    tag: Tag,
    inputs?: JSX.IntrinsicElements[Tag]
  ): <A extends keyof JSX.IntrinsicElements[Tag] = never>(inputs: {
    [K in A]-?: Observable<JSX.IntrinsicElements[Tag][K]>;
  }) => [ReactNode, null];
} =
  (tag: string, secondArg?: string[] | Record<string, unknown>, thirdArg?: Record<string, unknown>) =>
  (dynamicInputs?: Record<string, unknown>) => {
    const outputs = secondArg !== undefined && Array.isArray(secondArg) ? secondArg : [];
    const staticInputs = secondArg !== undefined && !Array.isArray(secondArg) ? secondArg : thirdArg;

    const eventHandler = outputs.some((o) => o !== "ref") ? new Subject<[string, unknown]>() : undefined;
    let outerRef: React.RefObject<HTMLInputElement> | undefined;

    // do it inside a function element to make sure the hooks work
    // 'children' is a prop so that our children() fn can pass them in for free
    const Element: FC = ({ children }: { children?: ReactNode }) => {
      outerRef = outputs.includes("ref") ? useRef<HTMLInputElement>(null) : undefined;
      const curatedProps: Record<string, unknown> = {};
      for (const [propName, propVal] of Object.entries(staticInputs ?? {})) {
        curatedProps[propName] = propVal;
      }
      for (const [propName, propVal] of Object.entries(dynamicInputs ?? {})) {
        curatedProps[propName] = useObservableState(propVal as Observable<unknown>);
      }
      for (const outputKey of outputs) {
        if (outputKey !== "ref") {
          curatedProps[outputKey as string] = (event: unknown) => eventHandler?.next([outputKey as string, event]);
        }
      }
      return createElement(tag, { children, ref: outerRef, ...curatedProps });
    };
    const events = Object.fromEntries(
      outputs
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
    return [
      <Element />,
      Array.isArray(secondArg)
        ? ({
            ...events,
            ...(outputs.includes("ref")
              ? {
                  ref: () => outerRef?.current,
                }
              : {}),
          } as never)
        : null,
    ] as [ReactNode, never];
  };

export const component: {
  <Tag extends keyof JSX.IntrinsicElements, OutputKeys extends Array<keyof JSX.IntrinsicElements[Tag] | "ref">>(
    tag: Tag,
    outputs: OutputKeys,
    inputs?: JSX.IntrinsicElements[Tag]
  ): (inputs: {}) => [ReactNode, GetOutputs<Tag, OutputKeys>];

  <Tag extends keyof JSX.IntrinsicElements>(
    tag: Tag,
    inputs?: JSX.IntrinsicElements[Tag]
  ): (inputs: {}) => [ReactNode, null];
} =
  (tag: string, secondArg?: string[] | Record<string, unknown>, thirdArg?: Record<string, unknown>) =>
  (dynamicInputs?: Record<string, unknown>) => {
    const simpleVals = inputComponent(tag as any, secondArg as any, thirdArg)(dynamicInputs as any);
    return simpleVals as [ReactNode, never];
  };
