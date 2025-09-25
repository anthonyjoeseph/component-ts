import * as r from "rxjs";
import Observable = r.Observable;
import {
  initEq,
  Instantaneous,
  InstClose,
  InstEmit,
  InstInit,
  InstInitChild,
  InstInitMerge,
  InstInitPlain,
  InstVal,
  InstValPlain,
  isInit,
  isVal,
  mapInit,
  mapVal,
} from "./types";
import { map, share } from "./basic-primitives";
import ArrayKeyedMap from "array-keyed-map";

export const batchSimultaneous = <A>(inst: Instantaneous<A>): Instantaneous<A[]> => {
  const memory = new ArrayKeyedMap<symbol[], number>();
  return inst.pipe(
    r.map((a) => {
      console.log(a);
      if (isInit(a)) {
        return mapInit(a, (full) => [full]);
      } else if (isVal(a)) {
        return mapVal(a, (full) => [full]);
      }
      return { type: "close", init: mapInit(a.init, () => []) } satisfies InstClose<A[]>;
    })
  );
};

/**
 * NOTES
 * - can we get rid of the "take" stuff in the emit types?
 *   - the "close" events should be enough, no?
 * - after an 'init-merge', there will always be a constant number of 'init-childs', equal to the number emitted by the topmost 'batchSync'
 *   - we should wait for these
 * - inits should be changed - output different from input
 *   - only one 'init' per provenance, since they are batched
 *   - 'InstValSync' parent's provenance should also be included
 *     - this covers all cases with "multiple" provenances
 *       - e.g. parent.switchMap(e => of(e))
 *         it technically emits on it's parent's provenance
 *         but it also has its child's provenance (the 'of')
 *     - this also means that 'InitChild' must be preserved, so that
 *       any deeper 'batchSimul' fns will have access to parent info
 */
