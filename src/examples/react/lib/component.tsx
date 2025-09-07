import { FC, type ReactNode, createElement, useEffect, useRef } from "react";
import { type Observable, Subject, filter, map, EMPTY, isObservable } from "rxjs";
import { useObservableState } from "observable-hooks";
import { pick } from "lodash";

export type RxComponent<Input, Events> = [Events, InputFn<Input>];

export type ComponentInput<C extends RxComponent<any, any>> = Parameters<C[1]["getNode"]>[0];

export type ComponentEvents<C extends RxComponent<any, any>> = C[0];

export type InputFn<Input> = { inputKeys: (keyof Input)[]; getNode: (input: Input) => ReactNode };

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
  ): <A extends keyof JSX.IntrinsicElements[Tag] = never>(
    dynamicInputs: A[]
  ) => [GetOutputs<Tag, OutputKeys>, InputFn<{ [K in A]-?: Observable<JSX.IntrinsicElements[Tag][K]> }>];

  <Tag extends keyof JSX.IntrinsicElements>(
    tag: Tag,
    inputs?: JSX.IntrinsicElements[Tag]
  ): <A extends keyof JSX.IntrinsicElements[Tag] = never>(
    dynamicInputs: A[]
  ) => [{}, InputFn<{ [K in A]-?: Observable<JSX.IntrinsicElements[Tag][K]> }>];
} =
  (tag: string, secondArg?: string[] | Record<string, unknown>, thirdArg?: Record<string, unknown>) =>
  (dynamicInputKeys: (string | number | symbol)[]) => {
    const outputs = secondArg !== undefined && Array.isArray(secondArg) ? secondArg : [];
    const staticInputs = secondArg !== undefined && !Array.isArray(secondArg) ? secondArg : thirdArg;

    const eventHandler = outputs.some((o) => o !== "ref") ? new Subject<[string, unknown]>() : undefined;
    let outerRef: React.RefObject<HTMLInputElement> | undefined;

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

    const eventsPlusRef = Array.isArray(secondArg)
      ? ({
          ...events,
          ...(outputs.includes("ref")
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
      const Element: FC = ({ children }: { children?: ReactNode }) => {
        outerRef = outputs.includes("ref") ? useRef<HTMLInputElement>(null) : undefined;
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
          if (isObservable(propVal)) {
            curatedProps[propName] = useObservableState(propVal as Observable<unknown>);
          }
        }
        for (const outputKey of outputs) {
          if (outputKey !== "ref") {
            curatedProps[outputKey as string] = (event: unknown) => eventHandler?.next([outputKey as string, event]);
          }
        }
        return createElement(tag, { children, ref: outerRef, ...curatedProps });
      };
      return <Element />;
    };
    return [eventsPlusRef, { getNode, inputKeys: dynamicInputKeys }] as [never, InputFn<Record<string, unknown>>];
  };

export const component: {
  <Tag extends keyof JSX.IntrinsicElements, OutputKeys extends Array<keyof JSX.IntrinsicElements[Tag] | "ref">>(
    tag: Tag,
    outputs: OutputKeys,
    inputs?: JSX.IntrinsicElements[Tag]
  ): [GetOutputs<Tag, OutputKeys>, InputFn<{}>];

  <Tag extends keyof JSX.IntrinsicElements>(tag: Tag, inputs?: JSX.IntrinsicElements[Tag]): [{}, InputFn<{}>];
} = (tag: string, secondArg?: string[] | Record<string, unknown>, thirdArg?: Record<string, unknown>) => {
  return inputComponent(tag as any, secondArg as any, thirdArg)([]) as [never, InputFn<{}>];
};
