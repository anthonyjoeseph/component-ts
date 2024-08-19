import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { component as c, Component } from "./lib/component/component";
import { applyNext, arrayEq, Behavior } from "./lib/state/behavior";
import { mapDomAction } from "./lib/state/array/domAction";

const arr = new r.BehaviorSubject<number[]>([]);
const inputId = new r.BehaviorSubject<string | undefined>(undefined);
const inputVal = () => {
  const id = inputId.getValue();
  if (id) {
    return (document.getElementById(id) as HTMLInputElement).value;
  }
  return undefined;
};

export const app = c("html", {}, [
  c("div", {}, [
    c("input", {
      type: { default: "text" },
      getId: applyNext(inputId),
    }),
    c("button", { innerText: { default: "render" }, onclick: () => arr.next(JSON.parse(inputVal() ?? "[]")) }),
    c("div", {
      domActionChildren: arrayEq(arr).pipe(
        ro.tap((action) => {
          console.log(action);
        }),
        ro.map(mapDomAction((num) => c("div", { innerText: { default: String(num) } })))
      ),
    }),
  ]),
  c("script", { src: { default: "./index.ts" } }),
]);
