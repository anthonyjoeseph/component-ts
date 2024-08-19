import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { pairChildrenWithId, Component } from "../component";
import { modifyDomActions } from "./modifyDom";

export const hydrate = (
  subscribeElement: Component,
  givenId?: string
): r.Observable<{ id: string; tag: string; value: unknown }> => {
  const id = givenId ?? subscribeElement.elementType;
  const element = document.getElementById(id) as HTMLElement;
  const allObs: r.Observable<{ id: string; tag: string; value: unknown }>[] = [];
  const removeSubj = new r.Subject<string>();

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

  const modifyActions = Object.entries(subscribeElement.modifyDom);
  allObs.push(
    ...modifyActions.map(([name, action]) =>
      (action as r.Observable<unknown>).pipe(
        ro.mergeMap((val): r.Observable<{ id: string; tag: string; value: unknown }> => {
          const currentElement = document.getElementById(id) as HTMLElement;
          return r.merge(
            r.of({ id, tag: name, value: "" }),
            ...modifyDomActions[name as keyof typeof modifyDomActions](
              val as never,
              currentElement,
              subscribeElement.modifyDomErrorCallback,
              (id) => removeSubj.next(id)
            ).map(({ component, id: childId }) =>
              hydrate(component, childId).pipe(
                ro.takeUntil(removeSubj.pipe(ro.filter((removeId) => removeId === childId)))
              )
            )
          );
        })
      )
    )
  );

  return r.merge(...allObs).pipe(
    ro.takeUntil(removeSubj.pipe(ro.filter((removeId) => removeId === id))),
    ro.finalize(() => removeSubj.complete())
  );
};
