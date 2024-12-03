import { h, Child, Result } from "hastscript";
import { Root, Element, Properties } from "hast";
import { DOMAction } from "../lib/state/array/domAction";
import type { Observable, MonoTypeOperatorFunction } from "rxjs";
import * as r from "rxjs";

export const takeSynchronous =
  <A>(): MonoTypeOperatorFunction<A> =>
  (a) =>
    a.pipe(r.takeUntil(r.of(null).pipe(r.observeOn(r.asapScheduler))));

/* export const e = <ElementType extends keyof HTMLElementTagNameMap>(
  s: ElementType,
  p: { [K in keyof HTMLElementTagNameMap[ElementType]]?: Observable<HTMLElementTagNameMap[ElementType][K]> },
  c?: RxElement[]
): RxElement => {
  const id = s;

  const j = new r.Subject();

  j.complete();

  const modifiers = Object.entries(p)
    .filter(([_, prop]) => !!prop)
    .map(([key, prop]) =>
      (prop as Observable<ValueOf<Properties>>).pipe(
        r.map((val): ModifyAction => ({ type: "modify", id, property: { [key]: val } }))
      )
    );

  const properties = r.combineLatest(modifiers).pipe(
    r.map((actions) => actions.map((action) => action.property)),
    r.map((props): Properties => props.reduce((acc, cur) => ({ ...acc, ...cur }), {}))
  );

  if (!c)
    return properties.pipe(
      r.take(1),
      r.map((properties): Action => ({ type: "init", element: h(s, { ...properties, id }) }))
    );

  const childActions = c.map((element) =>
    element.pipe(
      r.map((action, index): Action => {
        return action.type === "init"
          ? {
              type: "init",
              element: { ...action.element, properties: { id: `${id}-${index}${action.element.properties.id}` } },
            }
          : action.type === "modify"
            ? {
                type: "modify",
                id: `${id}-${index}${action.id}`,
                property: action.property,
              }
            : {
                type: "arrayAction",
                targetId: `${id}-${index}${action.targetId}`,
                domAction: action.domAction,
              };
      })
    )
  );

  const init = r.combineLatest(childActions.map((child) => child.pipe(r.filter((m) => m.type === "init")))).pipe(
    r.take(1),
    r.map((actions) => actions.map((action) => action.element)),
    r.map((elements): Action => ({ type: "init", element: h(s, p, elements) }))
  );
  return r.merge(init, ...childActions.map((child) => child.pipe(r.filter((m) => m.type !== "init"))));
}; */

const test = h(null, [h("a")]);

export type RxElement = Observable<Action>;

export type Action = InitAction | ModifyAction | ArrayAction;
export type InitAction = {
  type: "init";
  element: Element;
};
export type ModifyAction = {
  type: "modify";
  id: string;
  property: Properties;
};
export type ArrayAction = {
  type: "arrayAction";
  targetId: string;
  domAction: DOMAction<Element>;
};

export type ValueOf<A> = A[keyof A];
