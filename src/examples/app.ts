import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { element as e } from "../lib/node/element";
import { applyNext, arrayEq, getValue } from "../lib/state/behavior";
import { mapDomAction } from "../lib/array/domAction";
import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Record";

const rainbow = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

/* 
const num = (num: number) =>
  e("div", {
    style: {
      default:
        `margin-right: 10px; display:flex; justify-content:center; align-items: center; width: 100px; height:100px; background-color:${rainbow[num % rainbow.length]}` as unknown as CSSStyleDeclaration,
    },
    innerText: { default: String(num) },
  });

export const app = e("html", {}, [
  e("div", {}, [
    e("input", {
      type: { default: "text" },
      getId: applyNext(inputId),
    }),
    e("button", { innerText: { default: "render" }, onclick: () => arr.next(JSON.parse(inputVal() ?? "[]")) }),
    e("button", { innerText: { default: "prepend" }, onclick: () => prepend.next(777) }),
    e("div", {
      style: {
        default: "display:flex; flex-direction:row;" as unknown as CSSStyleDeclaration,
      },
      domActionChildren: arrayEq(arr, prepend.pipe(ro.map((val) => ({ type: "prepend", items: [val] }) as any))).pipe(
        ro.tap((action) => {
          console.log(action);
        }),
        ro.map(mapDomAction(num))
      ),
    }),
  ]),
  e("script", { src: { default: "./index.ts" } }),
]);
 */
