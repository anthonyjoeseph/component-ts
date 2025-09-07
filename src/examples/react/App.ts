import * as r from "rxjs";
import { range } from "lodash";
import { component as c, inputComponent as ic } from "./lib/component";
import { keyedSiblings as ks } from "./lib/siblings";
import { clicker } from "./components/clicker";
import { Key } from "ts-key-enum";
import { child } from "./lib/child";

const view = child(
  c("div"),
  ks(
    ["clickers", clicker()],
    ["text", c("input", ["ref", "onKeyPress"], { type: "text" })],
    ["readButton", c("button", ["onClick"], { children: "read text" })]
  )
);

const [events, { getNode }] = view;

r.merge(events.readButton.onClick, events.text.onKeyPress.pipe(r.filter((k) => k.key === Key.Enter)))
  .pipe(
    r.tap(() => {
      alert(events.text.ref().value as string);
    })
  )
  .subscribe();

export const App = getNode({
  clickers: { key: 0 },
});
