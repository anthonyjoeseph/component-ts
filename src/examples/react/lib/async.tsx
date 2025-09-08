import { FC, ReactNode, useEffect, useRef, useState } from "react";
import { RxComponent } from "./component";
import { Observable } from "rxjs";
import * as r from "rxjs";
import { useObservableState } from "observable-hooks";
import { NonEmptyArray } from "./util";
import { omit } from "lodash";
import { arrayDiffEq } from "../../../lib/array/diff";
import { applyAction, mapDomAction, SafeDOMAction } from "../../../lib/array/domAction";
import { pipe } from "fp-ts/lib/function";

export const asyncMapNonEmpty = <Input, Events>(
  component: () => RxComponent<Input, Events>
): RxComponent<
  { map: Observable<NonEmptyArray<Input & { key: string }>> },
  { map: Observable<NonEmptyArray<Events>> }
> => {
  const pushEvents = new r.Subject<NonEmptyArray<Events>>();
  return [
    {
      map: pushEvents,
    },
    {
      getNode: ({ map }) => {
        const StreamingFragment: FC = () => {
          const asyncEvents = useRef<Events[]>([]);
          const [asyncChildren, setAsyncChildren] = useState<ReactNode[]>([]);
          const prevInput = useRef<NonEmptyArray<Input & { key: string }> | null>(null);
          const childInputs = useObservableState(map);
          useEffect(() => {
            if (childInputs !== undefined) {
              if (prevInput.current != null) {
                const diffs = arrayDiffEq(prevInput.current, childInputs, { equals: (a, b) => a.key === b.key });
                const newActions = diffs.map(
                  mapDomAction((newInput) => {
                    const [events, { getNode }] = component();
                    const node = getNode(omit(newInput, ["key"]) as Input);
                    return [
                      events,
                      node != null && typeof node === "object" && "props" in node
                        ? { ...node, key: newInput.key }
                        : node,
                    ] as const;
                  })
                );
                const newEventActions = newActions.map(
                  mapDomAction(([events, _reactNode]) => events)
                ) as SafeDOMAction<Events>[];
                const newNodeActions = newActions.map(
                  mapDomAction(([_events, reactNode]) => reactNode)
                ) as SafeDOMAction<ReactNode>[];
                const newEvents = newEventActions.reduce((acc, cur) => applyAction(acc, cur), asyncEvents.current);
                const newNodes = newNodeActions.reduce((acc, cur) => applyAction(acc, cur), asyncChildren);

                pushEvents.next(newEvents as NonEmptyArray<Events>);
                asyncEvents.current = newEvents;
                setAsyncChildren(newNodes);
              } else {
                const childrenAndEvents = (childInputs ?? []).map((input) => {
                  const [events, { getNode }] = component();
                  const node = getNode(omit(input, ["key"]) as Input);
                  return [
                    events,
                    node != null && typeof node === "object" && "props" in node ? { ...node, key: input.key } : node,
                  ] as const;
                });
                const streamChildren = childrenAndEvents.map(([, child]) => child);
                const events = childrenAndEvents.map(([events]) => events);

                pushEvents.next(events as NonEmptyArray<Events>);
                asyncEvents.current = events;
                setAsyncChildren(streamChildren);
              }
              prevInput.current = childInputs;
            }
          }, [childInputs]);
          useEffect(() => {
            return () => {
              pushEvents.complete();
            };
          }, []);
          return <>{asyncChildren}</>;
        };
        return <StreamingFragment />;
      },
      inputKeys: ["map"],
    },
  ];
};

export const asyncMap: <Input, Events>(
  component: () => RxComponent<Input, Events>
) => RxComponent<{ map: Observable<(Input & { key: string })[]> }, { map: Observable<Events[]> }> =
  asyncMapNonEmpty as any;

export const asyncSingle = <Input, Events>(
  childComponent: RxComponent<Input, Events>
): RxComponent<{ asyn: Observable<Input & { key: string }> }, { asyn: Observable<Events> }> => {
  const [asyncEvents, { getNode: asyncGetNode }] = asyncMap(() => childComponent);

  return [
    {
      asyn: asyncEvents.map.pipe(r.map((v) => v[0] as Events)),
    },
    {
      getNode: ({ asyn }) => {
        return asyncGetNode({ map: asyn.pipe(r.map((v) => [v])) });
      },
      inputKeys: ["asyn"],
    },
  ];
};
