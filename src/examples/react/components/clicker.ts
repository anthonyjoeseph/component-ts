import * as r from "rxjs";
import { inputComponent as ie } from "../lib/component";
import { cycle } from "../lib/cycle";

export const clicker = (_: { key: number }) =>
  cycle(
    ie("button", ["onClick"], {
      style: { fontSize: 30 },
    })<"children">,
    (events) => {
      const numClicks = events.onClick().pipe(
        r.startWith(0),
        r.scan((acc) => acc + 1, -1)
      );
      return {
        input: {
          children: numClicks,
        },
        output: { numClicks },
      };
    }
  );
