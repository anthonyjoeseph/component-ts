import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as O from "fp-ts/Option";

export type ArrayEffects<A> =
  | {
      type: "append";
      items: A[];
    }
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
      item: A;
    }
  | {
      type: "replaceAll";
      items: A[];
    }
  | {
      type: "deleteAt";
      index: number;
      count: number;
    };

/**
 * Notes:
 * Array Action is different from Array Output!
 * Array output is always subset of the unique key actions
 * _warnings_ can be different though
 *
 * start at the end and work forward
 *
 * array semantic categories:
 * - Unique Ord
 *   - use UniqueSortedArray<A> newtype
 *   - advantage: All operations O(log n)
 *   - only these:
 *     - insert (elements)
 *     - delete (elements)
 *   - warning:
 *     - insert - already there
 *     - delete - not here
 * - Ord
 *   - use SortedArray<A> newtype
 *   - advantage: All operations O(log n)
 *   - disadvantage: no indexing
 *   - only these:
 *     - insert (elements)
 *     - delete (element, occurrence)
 *   - warnings: delete - not here
 * - Unique Eq
 *   - advantage: simpler semantics
 *   - use UniqueArray<A> newtype
 *   - only these:
 *     - append, prepend
 *     - insertAt (elements, index)
 *     - delete (element, occurrence) OR deleteAt (index)
 *   - warnings:
 *     - insert - already there, bounds
 *     - delete - not there
 * - Eq
 *   - advantage:
 *     - O(n) diffing - no need to move
 *   - only these:
 *     - insert (elements, index)
 *     - delete (element, index)
 *   - replaceN & deleteN use 'occurrence' instead of 'index'
 *   - warnings: insert, replace, delete, replaceN, deleteN
 * - Unique Key
 *   - advantage:
 *     - preserve moved nodes - avoid deleting nodes we don't have to
 *   - warnings: insert, replace, move & delete
 */

export type ArrayAction<A> =
  | {
      type: "append";
      items: A[];
    }
  | {
      type: "prepend";
      items: A[];
    }
  | {
      type: "insert";
      index: number;
      items: A[];
    }
  | {
      type: "replace";
      index: number;
      item: A;
    }
  | {
      type: "move";
      index: number;
      count: number;
      destination: number;
    }
  | {
      type: "delete";
      index: number;
      count: number;
    };
export const modifyArray = <A>(array: A[], action: ArrayAction<A>) => {
  switch (action.type) {
    case "insert":
      return pipe(array, A.insertAt(action.index, action.element));
    case "append":
      return pipe(array, A.append(action.element), O.some);
    case "prepend":
      return pipe(array, A.prepend(action.element), O.some);
    case "replace":
      return pipe(array, A.updateAt(action.index, action.element));
    case "delete":
      return pipe(array, A.deleteAt(action.index));
  }
};

export const arrayDiff = <A>(
  prev: A[],
  current: A[],
  uniqueKey: ((a: A) => string) | ((a: A) => number)
): ArrayAction<A>[] => {
  const prevKeys = prev.map(uniqueKey);
  const currentKeys = current.map(uniqueKey);

  const removedKeys = pipe(
    prevKeys,
    A.filterMapWithIndex((index, prevKey) => !currentKeys.includes(x))
  );
  const insertedKeys = prevKeys.filter((x) => !currentKeys.includes(x));

  return 3;
};
