import * as r from "rxjs";
import { range } from "lodash";
import { component as c, inputComponent as ic } from "../lib/component";
import { keyedSiblings as ks } from "../lib/siblings";
import { clicker } from "../components/clicker";
import { Key } from "ts-key-enum";
import { child } from "../lib/child";
import { asyncMap } from "../lib/async";

const view = child(
  c("div"),
  ks(
    ["clickers", asyncMap(clicker)],
    ["text", c("input", ["ref", "onKeyPress"], { type: "text" })],
    ["readButton", c("button", ["onClick"], { children: "read text" })]
  )
);

const [events, { getNode }] = view;

const onSubmit = r
  .merge(events.readButton.onClick, events.text.onKeyPress.pipe(r.filter((k) => k.key === Key.Enter)))
  .pipe(r.map(() => events.text.ref().value as string));

export const App = getNode({
  clickers: { map: onSubmit.pipe(r.map((v) => range(0, parseInt(v)).map((index) => ({ key: String(index) })))) },
});
