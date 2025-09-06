import * as r from "rxjs";
import { range } from "lodash";
import { component as e, inputComponent as ie } from "./lib/component";
import { cycle, CycleModel } from "./lib/cycle";
import { keyChildren as kc, map } from "./lib/children";
import { clicker } from "./components/clicker";
import { Observable } from "rxjs";

const view = kc(
  e("div"),
  ["clickers", map(clicker, ({ key }) => String(key))],
  ["text", e("input", ["ref", "onKeyPress"], { type: "text" })],
  ["readButton", e("button", ["onClick"], { children: "read text" })]
);

const model: CycleModel<
  typeof view,
  { readButtonClick: Observable<unknown>; textEnterPressed: Observable<unknown>; getText: () => string }
> = (events) => {
  return {
    input: {
      clickers: range(0, 4).map((key) => ({ key })),
    },
    output: {
      readButtonClick: events.readButton.onClick(),
      textEnterPressed: events.text.onKeyPress().pipe(r.filter((k) => k.key === "Enter")),
      getText: () => {
        const ref = events.text.ref();
        return ref.value as string;
      },
    },
  };
};

const [appNode, events] = cycle(view, model);

r.merge(events.readButtonClick, events.textEnterPressed)
  .pipe(
    r.tap(() => {
      alert(events.getText());
    })
  )
  .subscribe();

export const App = appNode;
