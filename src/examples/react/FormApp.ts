import { component as c, inputComponent as ic } from "./lib/component";
import { keyedSiblings as ks, mergeSiblings as ms } from "./lib/siblings";
import * as r from "rxjs";
import * as z from "zod";
import { formComponent, getFormValues, partitionObservable, splitObservable, validateNestedEither } from "./lib/form";
import { omit } from "lodash";
import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Record";

const errLabel = () => ic("div", { style: { color: "red" } })(["children"]);

const [events, { getNode, inputKeys }] = ks(
  ["name", formComponent(z.string(), ms(c("input", ["ref"], { type: "text", defaultValue: "ant jofis" }), errLabel()))],
  [
    "newPassword",
    formComponent(
      z.string().min(6).max(10),
      ms(c("input", ["ref"], { type: "password", defaultValue: "admin" }), errLabel())
    ),
  ],
  [
    "age",
    formComponent(z.coerce.number(), ms(c("input", ["ref"], { type: "number", defaultValue: "64" }), errLabel())),
  ],
  ["submit", c("button", ["onClick"], { children: "submit" })]
);

const inputStream = events.submit.onClick.pipe(
  r.map(() => {
    const a = omit(events, ["submit"]);
    const b = getFormValues(a);
    const c = validateNestedEither(b);
    return c;
  })
);
const { left, right: formValues } = partitionObservable(inputStream);
const splitLeft = splitObservable(left, inputKeys);

const inputs = pipe(
  splitLeft,
  R.map((children) => ({ children }))
);

formValues
  .pipe(
    r.tap((values) => {
      alert(JSON.stringify(values));
    })
  )
  .subscribe();

export const App = getNode(inputs);
