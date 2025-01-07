import type { Element, Text, Properties } from "hast";
import type { IdCallbacks, RxStaticNode, StaticAction } from "./actions";
import * as r from "rxjs";
import { DOMAction } from "../array/domAction";

export const hastToDomElement = async (e: Element | Text): Promise<HTMLElement | string> => {
  if (e.type === "text") return e.value;
  if (e.children.length === 0) {
    const newNode = document.createElement(e.tagName);
    Object.assign(newNode, e.properties);
    return newNode;
  }
  const children = await Promise.all((e.children as (Element | Text)[]).map(hastToDomElement));
  const newNode = document.createElement(e.tagName);
  Object.assign(newNode, e.properties);
  newNode.append(...children);
  return newNode;
};

export const addDomToAction = async (s: StaticAction): Promise<StaticActionWithDom> => {
  if (s.type === "init") {
    return {
      ...s,
      node: await hastToDomElement(s.node),
    };
  } else if (s.type === "modify") {
    return s;
  } else if ("items" in s.domAction) {
    return {
      ...s,
      domAction: {
        ...s.domAction,
        items: await Promise.all(s.domAction.items.map(hastToDomElement)),
      },
    };
  } else {
    return { ...s, domAction: s.domAction };
  }
};

type StaticActionWithDom = InitWithDom | ModifyWithDom | ChildWithDom;

type InitWithDom = {
  type: "init";
  node: HTMLElement | string;
  idCallbacks: IdCallbacks;
};

type ModifyWithDom = {
  type: "modify";
  id: string;
  property: Properties;
};

type ChildWithDom = {
  type: "child";
  targetId: string;
  domAction: DOMAction<HTMLElement | string>;
  idCallbacks: IdCallbacks;
};

export const applyToDom = (staticAction: StaticActionWithDom, rootNode: Node) => {
  if (staticAction.type === "init") {
    if (typeof staticAction.node === "string") {
      rootNode.appendChild(document.createTextNode(staticAction.node));
    } else {
      rootNode.appendChild(staticAction.node);
    }
  } else if (staticAction.type === "modify") {
    const domNode = document.getElementById(staticAction.id);
    for (const key in staticAction.property) {
      (domNode as any)[key] = staticAction.property[key];
    }
  } else if (staticAction.domAction.type === "insertAt") {
    const parent = document.getElementById(staticAction.targetId);
    for (const node of staticAction.domAction.items) {
      if (typeof node === "string") {
        parent?.children[staticAction.domAction.index]?.insertAdjacentText("afterend", node);
      } else {
        parent?.children[staticAction.domAction.index]?.insertAdjacentElement("afterend", node);
      }
    }
  } else if (staticAction.domAction.type === "deleteAt") {
    const parent = document.getElementById(staticAction.targetId);
    parent?.children[staticAction.domAction.index]?.remove();
  } else if (staticAction.domAction.type === "replaceAt") {
    const parent = document.getElementById(staticAction.targetId);
    parent?.children[staticAction.domAction.index]?.replaceWith(...staticAction.domAction.items);
  } else if (staticAction.domAction.type === "move") {
    const parent = document.getElementById(staticAction.targetId) as HTMLElement;
    const sourceNode = parent.children[staticAction.domAction.source] as HTMLElement;
    parent.removeChild(sourceNode);
    if (staticAction.domAction.source < staticAction.domAction.destination) {
      parent.children[staticAction.domAction.destination - 1]?.insertAdjacentElement("afterend", sourceNode);
    } else {
      parent.children[staticAction.domAction.destination]?.insertAdjacentElement("afterend", sourceNode);
    }
  } else if (staticAction.domAction.type === "prepend") {
    const parent = document.getElementById(staticAction.targetId);
    parent?.prepend(...staticAction.domAction.items);
  } else if (staticAction.domAction.type === "replaceAll") {
    const parent = document.getElementById(staticAction.targetId);
    parent?.replaceChildren(...staticAction.domAction.items);
  }
};

export const lazyBufferAnimationFrame =
  <A>(): r.OperatorFunction<A, A[]> =>
  (obs) => {
    const buffer: A[] = [];
    const end = new r.Subject<void>();
    return r
      .merge(
        obs.pipe(
          r.map((a) => ({ type: "value" as const, value: a })),
          r.finalize(() => end.next())
        ),
        r.animationFrames().pipe(r.map((anim) => ({ type: "anim-frame" as const, value: anim })))
      )
      .pipe(
        r.concatMap((val) => {
          if (val.type === "value") {
            buffer.push(val.value);
            return r.EMPTY;
          }
          const retVals = [...buffer];
          buffer.splice(0, buffer.length);
          return r.of(retVals);
        }),
        r.takeUntil(end),
        r.finalize(() => end.complete())
      );
  };

export type ScheduleRead = <A>(runFn: () => A) => Promise<A>;

export const createHydrate = () => {
  const scheduledReads: { runFn: () => unknown; resolver: (val: unknown) => void }[] = [];

  const scheduleRead: ScheduleRead = <A>(runFn: () => A) => {
    return new Promise<unknown>((resolver) => {
      scheduledReads.push({ runFn, resolver });
    }) as Promise<A>;
  };

  const applyDomOnAnimationFrame: r.MonoTypeOperatorFunction<StaticAction> = (staticActions: RxStaticNode) =>
    staticActions.pipe(
      // do this with mergeMap concurrency = 10?
      // will it still emit in order?
      r.concatMap((staticAction) =>
        // run the heavyweight "hast to dom element" function
        // asap - outside of the animation frame schedule
        // emitting values in order has tantamount imporatance
        r.defer(() => addDomToAction(staticAction)).pipe(r.map((withDom) => [withDom, staticAction] as const))
      ),
      lazyBufferAnimationFrame(),
      r.concatMap((staticActionWithDomBatch) => {
        for (const scheduledRead of scheduledReads) {
          const val = scheduledRead.runFn();
          scheduledRead.resolver(val);
        }
        if (scheduledReads.length > 0) scheduledReads.splice(0, scheduledReads.length);

        for (const [staticActionWithDom] of staticActionWithDomBatch) {
          applyToDom(staticActionWithDom, document.getRootNode());
        }
        return r.of(...staticActionWithDomBatch.map(([, withoutDom]) => withoutDom));
      })
    );
  return { applyDomOnAnimationFrame, scheduleRead };
};
