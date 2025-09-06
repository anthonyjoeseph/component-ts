import { component as e, inputComponent as ie } from "./lib/component";
import { keyChildren as kc, mergeChildren as mc } from "./lib/children";
import * as r from "rxjs";
import { cycle } from "./lib/cycle";
import * as R from "fp-ts/Record";
import { pipe } from "fp-ts/function";
import { omit } from "lodash";
import * as z from "zod";
import { formComponent, getFormValues, partitionObservable, splitObservable, validateNestedEither } from "./lib/form";

const errLabel = ie("div", { style: { color: "red" } })<"children">;

const wholeForm = kc(
  e("div"),
  ["name", formComponent(z.string(), mc(e("div"), [e("input", ["ref"], { type: "text" }), errLabel]))],
  [
    "newPassword",
    formComponent(z.string().min(6).max(10), mc(e("div"), [e("input", ["ref"], { type: "password" }), errLabel])),
  ],
  ["age", formComponent(z.coerce.number(), mc(e("div"), [e("input", ["ref"], { type: "number" }), errLabel]))],
  ["submit", e("button", ["onClick"], { children: "submit" })]
);

const [appNode, events] = cycle(wholeForm, (events) => {
  const inputStream = events.submit.onClick().pipe(
    r.map(() => {
      const a = events as Omit<typeof events, "submit">;
      const b = {
        name: events.name.ref().value,
        newPassword: events.newPassword.ref().value,
        age: events.age.ref().value,
      };
      const c = validateNestedEither(b);
      return c;
    })
  );
  const { left, right } = partitionObservable(inputStream);
  const inputs = pipe(
    splitObservable(left),
    R.map((children) => ({ children }))
  );
  return {
    input: {
      ...inputs,
      submit: undefined,
    },
    output: {
      formValues: right,
    },
  };
});

events.formValues
  .pipe(
    r.tap((values) => {
      alert(JSON.stringify(values));
    })
  )
  .subscribe();

export const App = appNode;
