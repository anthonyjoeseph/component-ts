import { FC, ReactNode, useEffect, useRef, useState } from "react";
import { RxComponent } from "./component";
import { Observable } from "rxjs";
import * as r from "rxjs";
import { useObservableState } from "observable-hooks";
import { ShallowAnd, NonEmptyArray } from "./util";
import omit from "lodash/omit";

export const asyncMapNonEmpty = <Input extends Record<string, unknown>, Events extends Record<string, unknown>>(
  component: () => RxComponent<Input, Events>
): RxComponent<
  { map: Observable<NonEmptyArray<ShallowAnd<Input, { key: string }>>> },
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
          const prevEventsByKey = useRef<Record<string, Events>>({});
          const [asyncChildren, setAsyncChildren] = useState<ReactNode[]>([]);
          const childInputs = useObservableState(map);
          useEffect(() => {
            if (childInputs !== undefined) {
              const prevChildrenByKey = Object.fromEntries(
                asyncChildren
                  .map((node) =>
                    node != null && typeof node === "object" && "props" in node
                      ? ([node.key, node] as [string, ReactNode])
                      : null
                  )
                  .filter((entry): entry is [string, ReactNode] => entry != null)
              );
              const childrenAndEvents = (childInputs ?? []).map((input) => {
                const key = (input as { key: string }).key;
                if (key in prevChildrenByKey && key in prevEventsByKey.current) {
                  return [key, prevEventsByKey.current[key] as Events, prevChildrenByKey[key]] as const;
                }
                const [events, { getNode }] = component();
                const node = getNode(omit(input as Input, ["key"]) as unknown as Input);
                return [
                  key,
                  events,
                  node != null && typeof node === "object" && "props" in node ? { ...node, key } : node,
                ] as const;
              });
              const streamChildren = childrenAndEvents.map(([, , child]) => child);
              const events = childrenAndEvents.map(([, events]) => events);

              pushEvents.next(events as NonEmptyArray<Events>);
              prevEventsByKey.current = Object.fromEntries(childrenAndEvents.map(([key, events]) => [key, events]));
              setAsyncChildren(streamChildren);
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

export const asyncMap: <Input extends Record<string, unknown>, Events extends Record<string, unknown>>(
  component: () => RxComponent<Input, Events>
) => RxComponent<{ map: Observable<ShallowAnd<Input, { key: string }>[]> }, { map: Observable<Events[]> }> =
  asyncMapNonEmpty as any;

export const asyncSingle = <Input extends Record<string, unknown>, Events extends Record<string, unknown>>(
  childComponent: RxComponent<Input, Events>
): RxComponent<{ asyn: Observable<ShallowAnd<Input, { key: string }>> }, { asyn: Observable<Events> }> => {
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
