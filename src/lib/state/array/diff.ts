import * as Eq from "fp-ts/Eq";
import * as Ord from "fp-ts/Ord";
import { DOMAction, SafeDOMAction } from "./DOMAction";
import { SortedArray } from "./ord";
import { getPatch, applyPatch, bestSubSequence } from "fast-array-diff";
import { type NonEmptyArray } from "fp-ts/lib/NonEmptyArray";

// modified from https://github.com/YuJianrong/fast-array-diff/blob/master/src/diff/same.ts#L3
export const lcsWithIndex = <T, U = T>(
  a: T[],
  b: U[],
  compareFunc: (ia: T, ib: U) => boolean = (ia: T, ib: U) => ia === (ib as unknown as T)
): { val: T; oldIndex: number; newIndex: number }[] => {
  const ret: { val: T; oldIndex: number; newIndex: number }[] = [];
  bestSubSequence(a, b, compareFunc, (type, oldArr, oldStart, oldEnd, _, newStart) => {
    if (type === "same") {
      for (let i = 0; i < oldEnd - oldStart; ++i) {
        ret.push({ val: oldArr[i + oldStart], oldIndex: i + oldStart, newIndex: i + newStart });
      }
    }
  });
  return ret;
};

export const arrayDiffOrd = <A>(prev: SortedArray<A>, current: SortedArray<A>, ord: Ord.Ord<A>): SafeDOMAction<A>[] => {
  if (prev.length === 0 || current.length === 0)
    return [{ type: "replaceAll", items: current } as unknown as SafeDOMAction<A>];
  return [];
};

type KeepEffect = { type: "keep"; from: number; to: number };
type MoveEffect = { type: "move"; from: number; to: number };
type ReplaceEffect = { type: "replace"; to: number; count: number };
type DeleteEffect = { type: "delete"; from: number };
type InsertEffect = { type: "insert"; to: number; count: number };
type ArrayEffect = KeepEffect | MoveEffect | ReplaceEffect | DeleteEffect | InsertEffect;
export const arrayDiffEq = <A>(prev: A[], current: A[], eq: Eq.Eq<A> = Eq.eqStrict): SafeDOMAction<A>[] => {
  if (prev.length === 0 || current.length === 0)
    return [{ type: "replaceAll", items: current } as unknown as SafeDOMAction<A>];

  const lcs = lcsWithIndex(prev, current, eq.equals);

  const prevEffects = prev.map((_, index): ArrayEffect => {
    const keptVal = lcs.find(({ oldIndex }) => oldIndex === index);
    return keptVal
      ? {
          type: "keep",
          from: keptVal.oldIndex,
          to: keptVal.newIndex,
        }
      : {
          type: "delete",
          from: index,
        };
  });
  let currentEffects = current.map((_, index): ArrayEffect => {
    const keptVal = lcs.find(({ newIndex }) => newIndex === index);
    return keptVal
      ? {
          type: "keep",
          from: keptVal.oldIndex,
          to: keptVal.newIndex,
        }
      : {
          type: "insert",
          to: index,
          count: 1,
        };
  });

  // convert insert/deletes -> moves
  for (let i = 0; i < currentEffects.length; i++) {
    const currentEffect = currentEffects[i];
    if (currentEffect.type === "insert") {
      const fromIndex = prevEffects.findIndex(
        (val): val is DeleteEffect => val.type === "delete" && eq.equals(prev[val.from], current[i])
      );
      if (fromIndex >= 0) {
        prevEffects[fromIndex] = { type: "move", from: fromIndex, to: i };
        currentEffects[i] = { type: "move", from: fromIndex, to: i };
      }
    }
  }

  // merge contiguous inserts
  let streakStart: number | undefined;
  for (let i = 0; i < currentEffects.length; i++) {
    if (currentEffects[i].type === "insert") {
      if (streakStart === undefined) {
        streakStart = i;
      } else {
        (currentEffects[streakStart] as InsertEffect).count++;
        (currentEffects[i] as InsertEffect).count = 0;
      }
    }
  }
  currentEffects = currentEffects.filter((val) => !(val.type === "insert" && val.count === 0));

  // convert inserts -> replacements
  currentEffects = currentEffects.map((currentEffect, index): ArrayEffect => {
    if (
      0 < index &&
      index < currentEffects.length - 1 &&
      currentEffects[index - 1].type === "keep" &&
      currentEffect.type === "insert" &&
      currentEffects[index + 1].type === "keep"
    ) {
      return {
        type: "replace",
        to: currentEffect.to,
        count: currentEffect.count,
      };
    }
    return currentEffect;
  });

  // build w/ actual elements

  const domActions: DOMAction<A>[] = [];

  return domActions as unknown as SafeDOMAction<A>[];
};

/* const oldArray = [0, 1, 2, 3, 4, 5];

const newArray = [99, 1, 2, 4, 5, 7, 3, 9]; 
*/

const oldArray = [0, 1, 2];

const newArray = [0, 10, 11, 12, 2];

const lcs = arrayDiffEq(oldArray, newArray);

console.log(lcs);

/**
prev: keep, move, delete
current: keep, move, insert, replace

prev:
{type: 'delete', from: 0}
{type: 'keep', from: 1, to: 1}
{type: 'keep', from: 2, to: 2}
{type: 'delete', from: 3}
{type: 'keep', from: 4, to: 3}
{type: 'keep', from: 5, to: 4}

current:
0 =
{type: 'insert', to: 0}
{type: 'keep', from: 1, to: 1}
{type: 'keep', from: 2, to: 2}
{type: 'keep', from: 4, to: 3}
{type: 'keep', from: 5, to: 4}
{type: 'insert', to: 5}
{type: 'insert', to: 6}
{type: 'insert', to: 7}
 */

/**
 *
ORD:
- diff
[1,2,3,6,7,8] -> [1,3,7,8,9]
  - append '9'
  - delete @ 3
  - delete @ 1

- upsert
[1,2,3,6,7,8]  insert 452
  - insert '4','5' @ 3
  - replace ''

- replace
[1,2,3,6,7,8]


EQ:
- diff
[1,2,4,5]->[0,1,3,4,2]
  - move '2' @ 3
  - delete @ 1
  - insert '3' @ 1
  - prepend '0'

OR
  - 

- find values, in order, of all similar elements, paired w/ index
  - [1,2,4]  ->  [[1, 0], [2, 1], [4, 2]]  &  [[1, 1], [4, 3], [2, 4]]

- find indicies of longest contiguous array similarity
  - [1,4] ->   [0, 2]  &   [1, 3]

- [{type: "keep", destination: 1, value: 1}, {type: "keep", destination: 3, value: 4}]

- find elements that are the same, from subset excluding contiguous similarity
  - [2]   ->   [1]   &   [4]
  - move:  1 -> 4-1=3

- [{type: "keep", destination: 1, source: 0}, {type: "keep", destination: 3, source: 2}, {type: "move", destination: 4, source: 1}]

- fill in the rest as "new"
- [{type: "new", destination: 0, value: 0 }, {type: "keep", destination: 1, source: 0}, {type: "new", destination: 2, value: 3 }, {type: "keep", destination: 3, source: 2}, {type: "move", destination: 4, source: 1}]

- replace 'news' with append, prepend, replace, insert, delete
- [{}, {type: "keep", destination: 3, source: 2}, {type: "move", destination: 4, source: 1}]



UNIQUE:
- diff
["one", "two", "four", "five"]->["zero", "one", "three", "four", "two"]
  - move 'two' @ 4
  - insert 'three' @ 1
  - prepend 'zero'


- insert


 */

/**
 * Notes:
https://stackoverflow.com/questions/12514970/is-getelementbyid-efficient
DOM abilities:
- element.replaceChildren = replaceAll
  - replaceChildren w/ no args  = deleteAll
- element.append = append (many)
  - node.appendChild (one)
- element.prepend = prepend (many)
- element.before = insertAt (many)
- element.after = insertAt (many)
- element.replaceWith = replace (should be able to insert many)
- element.insertAdjacentElement = insertAt (one, from child)
- node.insertBefore = (one, from parent)
- node.removeChild = (one)
- node.replaceChild = (one)


Parent's 0 element is first child:
- append = self.append
- prepend = self.prepend
- insertAt = self.children[index].after
- replaceAt = self.children[index].replaceWith
- replaceAll = self.replaceChildren
- deleteAt = self.removeChild (only one)
- move = self.removeChild & self.children[index].after (only one)

Relative to siblings - after, never before:
- append = self.parent.append
- prepend = self.parent.prepend
- insertAt = self.parent.children[index + self.index].after
- replaceAt = self.parent.children[index + self.index].replaceWith
- replaceAll = self.replaceChildren
- deleteAt = self.parent.removeChild(index + self.index) (only one)
- move = self.removeChild & self.children[index].after (only one)

 */
