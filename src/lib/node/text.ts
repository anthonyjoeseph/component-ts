import * as r from "rxjs";
import type { InitAction } from "./element";

export const text = (values: r.Observable<string>): r.Observable<InitAction> =>
  values.pipe(
    r.map((value) => ({
      type: "init",
      idCallbacks: [],
      node: {
        type: "text",
        value,
      },
    }))
  );
