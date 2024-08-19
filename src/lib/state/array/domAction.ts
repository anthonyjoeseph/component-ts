import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as O from "fp-ts/Option";
import * as NEA from "fp-ts/NonEmptyArray";
import * as E from "fp-ts/Either";

export type DOMAction<A> =
  | {
      type: "prepend";
      items: A[];
    }
  | {
      type: "insertAt";
      index: number;
      items: A[];
    }
  | {
      type: "replaceAt";
      index: number;
      items: A[];
    }
  | {
      type: "replaceAll";
      items: A[];
    }
  | {
      type: "deleteAt";
      index: number;
    }
  | {
      type: "move";
      source: number;
      destination: number;
    };

export type DOMActionError<A> =
  | {
      type: "insertAt-bounds";
      index: number;
      items: A[];
    }
  | {
      type: "replaceAt-bounds";
      index: number;
      items: A[];
    }
  | {
      type: "deleteAt-bounds";
      index: number;
    }
  | {
      type: "move-source-bounds";
      source: number;
      destination: number;
    }
  | {
      type: "move-destination-bounds";
      source: number;
      destination: number;
    };

export type SafeDOMAction<A> = DOMAction<A> & { readonly SafeDOMAction: unique symbol };

export const validateDOMAction = <A>(
  action: DOMAction<A>,
  array: A[]
): E.Either<NEA.NonEmptyArray<DOMActionError<A>>, SafeDOMAction<A>> => {
  const errors: O.Option<NEA.NonEmptyArray<DOMActionError<A>>> =
    action.type === "insertAt"
      ? pipe(
          {
            ...action,
            type: "insertAt-bounds" as const,
          },
          O.fromPredicate(() => action.index < 0 || array.length <= action.index),
          O.map(NEA.of)
        )
      : action.type === "replaceAt"
        ? pipe(
            {
              ...action,
              type: "replaceAt-bounds" as const,
            },
            O.fromPredicate(() => action.index < 0 || array.length <= action.index),
            O.map(NEA.of)
          )
        : action.type === "deleteAt"
          ? pipe(
              {
                ...action,
                type: "deleteAt-bounds" as const,
              },
              O.fromPredicate(() => action.index < 0 || array.length <= action.index),
              O.map(NEA.of)
            )
          : action.type === "move"
            ? pipe(
                [
                  pipe(
                    {
                      ...action,
                      type: "move-source-bounds" as const,
                    } as DOMActionError<A>,
                    O.fromPredicate(() => action.source < 0 || array.length <= action.source)
                  ),
                  pipe(
                    {
                      ...action,
                      type: "move-destination-bounds" as const,
                    },
                    O.fromPredicate(() => action.destination < 0 || array.length <= action.destination)
                  ),
                ],
                A.compact,
                NEA.fromArray
              )
            : O.none;
  return pipe(
    errors,
    E.fromOption(() => action as SafeDOMAction<A>),
    E.swap
  );
};

export const applyAction = <A>(array: A[], action: SafeDOMAction<A>): A[] => {
  switch (action.type) {
    case "replaceAll":
      return action.items;
    case "prepend":
      return [...action.items, ...array];
    // fp-ts-std: insertMany
    case "insertAt":
      return [...array.slice(0, action.index), ...action.items, ...array.slice(action.index, array.length)];
    // fp-ts-std: dropAt + insertMany
    case "replaceAt":
      return [
        ...array.slice(0, action.index),
        ...action.items,
        ...array.slice(action.index + action.items.length, array.length),
      ];
    // fp-ts-std: dropAt
    case "deleteAt":
      return [...array.slice(0, action.index), ...array.slice(action.index + 1, array.length)];
    // fp-ts-std: dropAt + insertMany
    case "move":
      if (action.source < action.destination)
        return [
          ...array.slice(0, action.source),
          ...array.slice(action.source + 1, action.destination),
          array[action.source],
          ...array.slice(action.destination, array.length),
        ];
      return [
        ...array.slice(0, action.destination),
        ...array.slice(action.destination + 1, action.source),
        array[action.destination],
        ...array.slice(action.source, array.length),
      ];
  }
};

export const mapDomAction =
  <A, B>(fn: (a: A) => B) =>
  (domAction: DOMAction<A>): DOMAction<B> => {
    if (domAction.type === "move" || domAction.type === "deleteAt") {
      return domAction;
    }
    return {
      ...domAction,
      items: domAction.items.map(fn),
    };
  };
