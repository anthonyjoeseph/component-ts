import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { pairChildrenWithId, SubscribeElement } from "./lib-node";

export const hydrate = (
  subscribeElement: SubscribeElement,
  givenId?: string
): r.Observable<{ id: string; tag: string; value: unknown }> => {
  const id = givenId ?? subscribeElement.elementType;
  const element = document.getElementById(id) as HTMLElement;
  const allObs: r.Observable<{ id: string; tag: string; value: unknown }>[] = [];

  for (const [eventName, callback] of Object.entries(subscribeElement.tagEventCallbacks)) {
    element.addEventListener(eventName.slice(2), callback);
  }
  for (const [tagName, { latest }] of Object.entries(subscribeElement.tagValues)) {
    if (latest) {
      allObs.push(
        latest.pipe(
          ro.tap((value) => {
            (element as unknown as Record<string, unknown>)[tagName] = value;
          }),
          ro.map((value) => ({ id, tag: tagName, value }))
        )
      );
    }
  }
  subscribeElement.idCallback(id);
  for (const { element, id: childId } of pairChildrenWithId(subscribeElement.children, id)) {
    allObs.push(hydrate(element, childId));
  }
  return r.merge(...allObs);
};
