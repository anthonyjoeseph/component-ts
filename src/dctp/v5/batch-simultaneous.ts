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
  InstValFiltered,
  InstValPlain,
  InstValSync,
  isInit,
  isVal,
  mapVal,
} from "./types";
import { map, share } from "./basic-primitives";
import ArrayKeyedMap from "array-keyed-map";

export const batchSimultaneous = <A>(inst: Instantaneous<A>): Instantaneous<A[]> => {
  const memory = new ArrayKeyedMap<symbol[], number>();
  return inst.pipe(
    r.map((a) => {
      console.log(a);
      if (isVal(a)) {
        return mapVal(a, (full) => ({
          ...full,
          value: [full.value],
        }));
      }
      return a;
    })
  );
};

/**
 * NOTES
 * - after a "filtered" value, there will always be an 'init-child' and a 'value-sync'
 *   - we should wait for these
 *   - this also means that our "EMPTY" needs to emit an 'init' and a 'close'
 *     - b/c we are using the native 'switchMap', which will filter it out entirely otherwise
 * - after an 'init-merge', there will always be a constant number of 'init-childs', equal to the number emitted by the topmost 'batchSync'
 *   - we should wait for these
 */
