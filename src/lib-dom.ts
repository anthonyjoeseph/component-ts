import { Observable, type Subscription } from "rxjs";
import { pairChildrenWithId, SubscribeElement } from "./lib-node";

const body = document.getElementById("the-body");

const newChild = document.createElement("input");

newChild.value = "stuff";

body?.append(newChild);

// TODO: return Observable<{ id: string; tag: string; value: string }>

export const hydrate = (subscribeElement: SubscribeElement, givenId?: string): void => {
  const id = givenId ?? subscribeElement.elementType;
  const element = document.getElementById(id) as HTMLElement;
  for (const [eventName, callback] of Object.entries(subscribeElement.tagEventCallbacks)) {
    element.addEventListener(eventName, callback);
  }
  for (const [tagName, { latest }] of Object.entries(subscribeElement.tagValues)) {
    if (latest) {
      latest.subscribe((value) => {
        (element as unknown as Record<string, unknown>)[tagName] = value;
      });
    }
  }
  subscribeElement.idCallback(id);
  for (const { element, id: childId } of pairChildrenWithId(subscribeElement.children, id)) {
    hydrate(element, childId);
  }
};
