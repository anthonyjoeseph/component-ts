import * as r from "rxjs";
import { range } from "lodash";
import { element as e } from "./lib/element";
import { cycle } from "./lib/cycle";
import { children as c, CycleModel, map } from "./lib/component";
import { clickerView, clickerModel } from "./components/clicker";

const manyClickers = map(clickerView, ({ key }) => String(key));

// TODO: make things work equally nice with ReactNodes & with RxComponents
// the thunk here feels extraneous
// and it'd be nice to add plain ReactNodes to the list of children
const view = c(
  () => e("div", []),
  ["clickers", manyClickers],
  ["text", () => e("textarea", ["value"])],
  ["readButton", () => e("button", ["onClick"], { children: "read text" })]
);

// TODO: these undefineds values shouldn't be here
// part of the same work as above
const model: CycleModel<typeof view> = (events) => {
  return {
    clickers: range(0, 4).map((i) => clickerModel(i)(events.clickers[i]!)),
    readButton: undefined,
    text: undefined,
  };
};

const [appNode, events] = cycle(view, model);

events.readButton.onClick
  .pipe(
    r.tap(() => {
      alert(events.text.value());
    })
  )
  .subscribe();

export const App = appNode;
