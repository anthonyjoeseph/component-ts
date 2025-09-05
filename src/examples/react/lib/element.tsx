import { FC, type ReactNode, createElement, useRef } from "react";
import { type Observable, of, isObservable, Subject, filter, map } from "rxjs";
import { useObservable, useObservableEagerState, useObservableState } from "observable-hooks";

export type GetInputs<Tag extends keyof JSX.IntrinsicElements, Keys extends Array<keyof JSX.IntrinsicElements[Tag]>> = {
  [K in Keys[number]]: Observable<JSX.IntrinsicElements[Tag][K]>;
};

export type GetOutputs<
  Tag extends keyof JSX.IntrinsicElements,
  Keys extends Array<keyof JSX.IntrinsicElements[Tag]>,
> = {
  [K in Keys[number]]: NonNullable<JSX.IntrinsicElements[Tag][K]> extends React.ReactEventHandler<any>
    ? Observable<Parameters<NonNullable<JSX.IntrinsicElements[Tag][K]>>[0]>
    : K extends "value"
      ? () => string
      : never;
};

export const element = <
  Tag extends keyof JSX.IntrinsicElements,
  OutputKeys extends Array<keyof JSX.IntrinsicElements[Tag]>,
>(
  tag: Tag,
  outputs: OutputKeys,
  inputs?: {
    [K in keyof JSX.IntrinsicElements[Tag]]: JSX.IntrinsicElements[Tag][K] | Observable<JSX.IntrinsicElements[Tag][K]>;
  }
): [ReactNode, GetOutputs<Tag, OutputKeys>] => {
  const eventHandler = new Subject<[string, unknown]>();
  let outerRef: React.RefObject<HTMLInputElement>;

  // do it inside a function element to make sure the hooks work
  // 'children' is a prop so that our children() fn can pass them in for free
  const Element: FC = ({ children }: { children?: ReactNode }) => {
    outerRef = useRef<HTMLInputElement>(null);
    const curatedProps: Record<string, unknown> = {};
    if (inputs !== undefined) {
      for (const [propName, propVal] of Object.entries(inputs)) {
        if (isObservable(propVal)) {
          curatedProps[propName] = useObservableState(propVal);
        } else {
          curatedProps[propName] = propVal;
        }
      }
    }
    for (const outputKey of outputs) {
      if (outputKey !== "value") {
        curatedProps[outputKey as string] = (event: unknown) => eventHandler.next([outputKey as string, event]);
      }
    }
    return createElement(tag, { children, ref: outerRef, ...curatedProps });
  };
  const events = Object.fromEntries(
    outputs
      .filter((outputKey) => outputKey !== "value")
      .map((outputKey): [string, unknown] => {
        return [
          outputKey as string,
          eventHandler.pipe(
            filter(([key]) => key === outputKey),
            map(([, value]) => value)
          ),
        ];
      })
  );
  return [
    <Element />,
    {
      ...events,
      ...(outputs.includes("value" as keyof JSX.IntrinsicElements[Tag])
        ? {
            value: () => outerRef.current?.value,
          }
        : {}),
    } as never,
  ];
};
