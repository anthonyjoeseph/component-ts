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
