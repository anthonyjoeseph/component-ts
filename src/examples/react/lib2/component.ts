import {
  FC,
  Fragment,
  type ReactNode,
  createElement,
  useEffect,
  useRef,
} from "react";
import {
  type Observable,
  Subject,
  filter,
  map,
  EMPTY,
  isObservable,
  scan,
  of,
  merge,
  defer,
} from "rxjs";
import { ShallowUnionToIntersection } from "../lib/util";

/**
 * (attrs: Attributes) => [Events, Actions]
 *
 * Problem: can't iterate over a proxy, reduces flexibility
 * events often don't depend on attributes - this is usually unnecessary
 */

/**
 * [Events, (attrs: Attributes) => Actions]
 *
 * Problem: events sometimes have dependencies, e.g. DB or window
 *
 * can't use a proxy in these cases,
 * since dependencies are static & eagerly evaluated
 */

/**
 * (Dependencies) => [Events, (Attributes) => Actions]
 *
 * Problem: events sometimes depend on attributes, e.g. Modals, Tables
 * also, this is hugely more complicated than the other solutions
 */

type Actions = Observable<{ key: string; action: string }>;

type NewComponent<
  Attributes extends Record<string, unknown> = {},
  Events extends Record<string, unknown> = {},
> = {
  // hast-like static info, w/o reference to the DOM
  node: ReactNode;

  // 'self' includes an id, giving reference to the actual DOM
  hydrate: (
    self: ReactNode,
    domEmissions: Actions,
    attrs: Attributes,
  ) => { events: Events; domActions: Actions };
};

// domActions -> domEvents
declare const applyDomActions: (allInputs: Actions) => Actions;

const mapComponent = <
  Component extends NewComponent<any, any>,
  NewAttributes extends Record<string, unknown> = {},
  NewEvents extends Record<string, unknown> = {},
>(
  component: Component,
  fn: (
    getEvents: (oldAttrs: GetAttributes<Component>) => {
      events: GetEvents<Component>;
      domActions: Actions;
    },
    newAttrs: NewAttributes,
  ) => { domActions: Actions; newEvents: NewEvents },
): NewComponent<NewAttributes, NewEvents> => {
  return {
    node: component.node,
    hydrate: (self, domEvents, newAttrs) => {
      const { domActions, newEvents } = fn(
        (oldAttrs) => component.hydrate(self, domEvents, oldAttrs),
        newAttrs,
      );
      return { events: newEvents, domActions };
    },
  };
};

type GetAttributes<Component extends NewComponent<any, any>> = Parameters<
  Component["hydrate"]
>[2];

type GetEvents<Component extends NewComponent<any, any>> = ReturnType<
  Component["hydrate"]
>["events"];

declare const testComp: NewComponent<
  { text: Observable<string> },
  { onClick: Observable<void> }
>;

const counterProgram = (eventRef: () => GetEvents<typeof testComp>) => {
  return {
    text: defer(() => eventRef().onClick).pipe(
      scan((acc) => acc + 1, 0),
      map(String),
    ),
  };
};

const counterButton = mapComponent(testComp, (getEvents) => {
  const { events, domActions } = getEvents(counterProgram(() => events));
  return { domActions, newEvents: {} };
});

declare const modal: NewComponent<
  { darkMode: Observable<"light" | "dark">; open: Observable<void> },
  { state: Observable<"open" | "closed"> }
>;

declare const button: NewComponent<
  { darkMode: Observable<"light" | "dark"> },
  { onClick: Observable<void> }
>;

declare const rawApp: NewComponent<
  { darkMode: Observable<"light" | "dark">; modal: { open: Observable<void> } },
  {
    button: { onClick: Observable<void> };
    modal: { state: Observable<"open" | "closed"> };
  }
>;

const app = mapComponent(
  rawApp,
  (getEvents, { darkMode }: { darkMode: Observable<"light" | "dark"> }) => {
    const { events, domActions } = getEvents({
      darkMode,
      modal: {
        open: defer(() => events.button.onClick),
      },
    });
    return {
      newEvents: { state: events.modal.state },
      domActions,
    };
  },
);
