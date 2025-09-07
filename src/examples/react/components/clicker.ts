import * as r from "rxjs";
import { inputComponent as ie, RxComponent } from "../lib/component";

export const clicker = (): RxComponent<{}, { numClicks: r.Observable<number> }> => {
  const [events, { getNode }] = ie("button", ["onClick"], {
    style: { fontSize: 30 },
  })(["children"]);

  const numClicks = events.onClick.pipe(
    r.startWith(0),
    r.scan((acc) => acc + 1, -1)
  );

  const node = getNode({ children: numClicks });

  return [{ numClicks }, { getNode: () => node, inputKeys: [] }];
};
