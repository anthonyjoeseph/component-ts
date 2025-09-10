import * as r from "rxjs";
import range from "lodash/range";
import { component as c, RxComponent } from "../lib/component";
import { keyedSiblings as ks } from "../lib/siblings";
import { Key } from "ts-key-enum";
import { asyncMap } from "../lib/async";

export const clicker = (): RxComponent<{}, { numClicks: r.Observable<number> }> => {
  const [events, { getNode }] = c("button", ["children"], ["onClick"], {
    style: { fontSize: 12 },
    children: 0,
  });

  const numClicks = events.onClick.pipe(
    r.startWith(0),
    r.scan((acc) => acc + 1, -1)
  );

  const node = getNode({ children: numClicks });

  return [{ numClicks }, { getNode: () => node, inputKeys: [] }];
};

const view = c(
  "div",
  ks({
    clickers: asyncMap(clicker),
    text: c("input", [], ["ref", "onKeyPress"], { type: "text" }),
    readButton: c("button", [], ["onClick"], { children: "read text" }),
  })
);

const [events, { getNode }] = view;

const onSubmit = r
  .merge(events.readButton.onClick, events.text.onKeyPress.pipe(r.filter((k) => k.key === Key.Enter)))
  .pipe(r.map(() => events.text.ref().value as string));

export const App = () =>
  getNode({
    clickers: { map: onSubmit.pipe(r.map((v) => range(0, parseInt(v)).map((index) => ({ key: String(index) })))) },
  });
