import * as Eq from "fp-ts/Eq";
import * as Ord from "fp-ts/Ord";
import { SortedArray } from "./ord";
import { DOMAction, SafeDOMAction } from "./DOMAction";
import { bestSubSequence } from "fast-array-diff";

export const arrayDiffOrd = <A>(prev: SortedArray<A>, current: SortedArray<A>, ord: Ord.Ord<A>): SafeDOMAction<A>[] => {
  if (prev.length === 0 || current.length === 0)
    return [{ type: "replaceAll", items: current } as unknown as SafeDOMAction<A>];

  let replaceAll = true;
  let prevIndex = 0;
  let currentIndex = 0;
  let prevWasEquals = false;
  const actions: DOMAction<A>[] = [];
  while (prevIndex < prev.length && currentIndex < current.length) {
    const prevItem = prev[prevIndex];
    const currentItem = current[currentIndex];
    const comparison = ord.compare(prevItem, currentItem);
    if (comparison === -1) {
      actions.push({ type: "deleteAt", index: currentIndex });
      prevIndex++;
      prevWasEquals = false;
    } else if (comparison === 0) {
      replaceAll = false;
      prevWasEquals = true;
      prevIndex++;
      currentIndex++;
    } else if (comparison === 1) {
      const mostRecentAction = actions[actions.length - 1];
      if (mostRecentAction?.type === "deleteAt" && !prevWasEquals) {
        actions[actions.length - 1] = { type: "replaceAt", index: mostRecentAction.index, items: [currentItem] };
      } else if (
        mostRecentAction?.type === "prepend" ||
        mostRecentAction?.type === "insertAt" ||
        mostRecentAction?.type === "replaceAt"
      ) {
        mostRecentAction.items.push(currentItem);
      } else if (actions.length === 0) {
        actions.push({ type: "prepend", items: [currentItem] });
      } else {
        actions.push({ type: "insertAt", items: [currentItem], index: currentIndex });
      }
      currentIndex++;
      prevWasEquals = false;
    }
  }
  if (replaceAll) return [{ type: "replaceAll", items: current } as unknown as SafeDOMAction<A>];
  for (let i = prevIndex; i < prev.length; i++) {
    actions.push({ type: "deleteAt", index: currentIndex });
    currentIndex++;
  }
  if (currentIndex < current.length - 1) {
    actions.push({ type: "append", items: current.slice(currentIndex, current.length) });
  }
  for (let i = currentIndex; i < current.length; i++) {
    currentIndex++;
  }
  return actions as unknown as SafeDOMAction<A>[];
};

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

const findIndexAtOccurrence = <A>(arr: A[], occurrence: number, fn: (val: A) => boolean): number => {
  let occurCount = 0;
  for (let i = 0; i < arr.length; i++) {
    if (fn(arr[i])) {
      if (occurCount === occurrence) {
        return i;
      } else {
        occurCount++;
      }
    }
  }
  return -1;
};

type KeepEffect = { type: "keep"; from: number; to: number };
type MoveEffect = { type: "move"; from: number; to: number };
type ReplaceEffect = { type: "replace"; from: number; to: number; count: number };
type DeleteEffect = { type: "delete"; from: number };
type InsertEffect = { type: "insert"; to: number; count: number };
type ArrayEffect = KeepEffect | MoveEffect | ReplaceEffect | DeleteEffect | InsertEffect;
export const arrayDiffEq = <A>(prev: A[], current: A[], eq: Eq.Eq<A> = Eq.eqStrict): SafeDOMAction<A>[] => {
  if (prev.length === 0 || current.length === 0)
    return [{ type: "replaceAll", items: current } as unknown as SafeDOMAction<A>];

  const lcs = lcsWithIndex(prev, current, eq.equals);

  if (lcs.length === 0) return [{ type: "replaceAll", items: current } as unknown as SafeDOMAction<A>];

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

  let moveSources: number[] = [];
  let moveDestinations: { prevKeep: number; skipInserts: number }[] = [];
  const bumpMoveSources = (latestInsert: number, numInserted: number, upperBound?: number) => {
    moveSources = moveSources.map((source) =>
      latestInsert < source && (!upperBound || source <= upperBound) ? source + numInserted : source
    );
  };
  const bumpMoveDestinations = (latestInsert: number, numInserted: number, upperBound?: number) => {
    moveDestinations = moveDestinations.map(({ prevKeep, skipInserts }) => ({
      prevKeep: latestInsert < prevKeep && (!upperBound || prevKeep <= upperBound) ? prevKeep + numInserted : prevKeep,
      skipInserts,
    }));
  };
  const bumpMoveDestinationInserts = (keepIndex: number, insertIndex: number) => {
    moveDestinations = moveDestinations.map(({ prevKeep, skipInserts }) => ({
      prevKeep,
      skipInserts: prevKeep === keepIndex && insertIndex <= skipInserts ? skipInserts + 1 : skipInserts,
    }));
  };

  // convert insert/deletes -> moves
  //   for each 'insert'
  //     if an element already exists that's marked for deletion
  //       instead, mark it as a 'move'
  let latestKeep = -1;
  let numInsertsSinceKeep = 0;
  for (let i = 0; i < currentEffects.length; i++) {
    const currentEffect = currentEffects[i];
    if (currentEffect.type === "keep") {
      latestKeep++;
      numInsertsSinceKeep = 0;
    } else if (currentEffect.type === "insert") {
      // find an equivalent element that was marked for deletion
      const fromIndex = prevEffects.findIndex(
        (val): val is DeleteEffect => val.type === "delete" && eq.equals(prev[val.from], current[i])
      );
      if (fromIndex >= 0) {
        // insert after the most recent keep
        // we don't really use the "from" or "to" in Effects
        // rather we use 'moveSources' and 'moveDestinations',
        // which preserve references as the array is mutated over time
        const to = findIndexAtOccurrence(prevEffects, latestKeep, (val) => val.type === "keep") + 1;
        prevEffects[fromIndex] = { type: "move", from: fromIndex, to };
        currentEffects[i] = { type: "move", from: fromIndex, to };
        moveSources.push(fromIndex);
        moveDestinations.push({ prevKeep: to, skipInserts: numInsertsSinceKeep });
      } else {
        numInsertsSinceKeep++;
      }
    }
  }

  // merge contiguous inserts
  // don't filter out 0-count inserts -
  // we need to preserve the currentEffects indicies
  // so that "keep.to" fields are still correct (we use them in the next section)
  let streakStart: number | undefined;
  for (let i = 0; i < currentEffects.length; i++) {
    if (currentEffects[i].type === "insert") {
      if (streakStart === undefined) {
        streakStart = i;
      } else {
        (currentEffects[streakStart] as InsertEffect).count++;
        (currentEffects[i] as InsertEffect).count = 0;
      }
    } else {
      streakStart = undefined;
    }
  }

  // convert inserts -> replacements
  //   if prevEffects contains keep/delete/keep pattern
  //   find longest insert between corresponding keeps in currentEffects
  const eligibleDeletes = prevEffects
    .filter(
      (prevEffect, i): prevEffect is DeleteEffect =>
        0 < i &&
        i < prevEffects.length - 1 &&
        prevEffects[i - 1].type === "keep" &&
        prevEffect.type === "delete" &&
        prevEffects[i + 1].type === "keep"
    )
    .map((val) => ({
      val,
      prevKeep: prevEffects[val.from - 1] as KeepEffect,
      nextKeep: prevEffects[val.from + 1] as KeepEffect,
    }));
  for (const { val, prevKeep, nextKeep } of eligibleDeletes) {
    let biggestInsert: { val: InsertEffect; to: number } | undefined;
    for (let to = prevKeep.to; to < nextKeep.to; to++) {
      const currentEffect = currentEffects[to];
      if (currentEffect.type === "insert" && (!biggestInsert || currentEffect.count > biggestInsert.val.count)) {
        biggestInsert = { val: currentEffect, to };
      }
    }
    if (biggestInsert) {
      const replace: ReplaceEffect = {
        type: "replace",
        from: val.from,
        to: biggestInsert.to,
        count: biggestInsert.val.count,
      };
      prevEffects[val.from] = replace;
      currentEffects[biggestInsert.to] = replace;
    }
  }

  // build w/ actual elements
  //    delete, replace, move, insert, prepend, append ?

  const domActions: DOMAction<A>[] = [];

  // is our final "insert" actually an append?
  let appendIndex: number | undefined;
  for (let i = currentEffects.length - 1; i >= 0; i--) {
    const currentEffect = currentEffects[i];
    if (currentEffect.type === "keep") break;
    if (currentEffect.type === "insert" && currentEffect.count > 0) {
      appendIndex = i;
      break;
    }
  }

  // delete

  // a 'keep segment' is the # indices _before_ a 'keep' element
  let keepSegmentLength: number[] = [];
  let currentSegmentLength = 1;
  for (let i = 0; i < prevEffects.length; i++) {
    const currentEffect = prevEffects[i];
    if (currentEffect.type === "delete") {
      domActions.push({
        type: "deleteAt",
        index: currentEffect.from,
      });
      bumpMoveSources(i, -1);
      bumpMoveDestinations(i, -1);
    }
    if (prevEffects[i].type === "keep") {
      keepSegmentLength.push(currentSegmentLength);
      currentSegmentLength = 1;
    } else {
      currentSegmentLength++;
    }
  }

  // append / replace / insert / prepend
  let whichKeep = -1;
  let latestInsert = 0;
  for (const currentEffect of currentEffects) {
    if (currentEffect.type === "keep") {
      whichKeep++;
      latestInsert += keepSegmentLength[whichKeep];
      continue;
    }
    if (currentEffect.type === "insert") {
      if (currentEffect.count === 0) continue;
      const items = current.slice(currentEffect.to, currentEffect.to + currentEffect.count);
      if (currentEffect.to === 0) {
        domActions.push({ type: "prepend", items });
        bumpMoveSources(0, items.length);
        bumpMoveDestinations(0, items.length);
        latestInsert += items.length;
      } else if (currentEffect.to === appendIndex) {
        domActions.push({ type: "append", items });
      } else {
        domActions.push({ type: "insertAt", items, index: latestInsert });
        bumpMoveSources(latestInsert, items.length);
        bumpMoveDestinations(latestInsert, items.length);
        latestInsert += items.length;
      }
    } else if (currentEffect.type === "replace") {
      const items: A[] = current.slice(currentEffect.to, currentEffect.to + currentEffect.count);
      domActions.push({ type: "replaceAt", index: latestInsert, items });
      bumpMoveSources(latestInsert, items.length);
      bumpMoveDestinations(latestInsert, items.length);
      latestInsert += items.length;
    }
  }
  // move
  for (let moveIndex = 0; moveIndex < moveSources.length; moveIndex++) {
    const { prevKeep, skipInserts } = moveDestinations[moveIndex];
    const source = moveSources[moveIndex];
    const destination = prevKeep + skipInserts;
    domActions.push({ type: "move", source, destination });

    bumpMoveDestinationInserts(prevKeep, skipInserts);
    if (source < destination) {
      bumpMoveSources(source, -1, destination);
      bumpMoveDestinations(source, -1, destination);
    } else {
      bumpMoveSources(destination, 1, source);
      bumpMoveDestinations(destination, 1, source);
    }
  }

  return domActions as unknown as SafeDOMAction<A>[];
};

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
