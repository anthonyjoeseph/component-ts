import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { component as c } from "./lib/component/component";
import { applyNext, arrayEq, getValue } from "./lib/state/behavior";
import { mapDomAction } from "./lib/state/array/domAction";
import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Record";

const rainbow = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

const applySafe =
  <A, B>(fn: (a: A) => B) =>
  (a: A | undefined): B | undefined =>
    a ? fn(a) : undefined;

const arr = new r.BehaviorSubject<number[]>([]);
const prepend = new r.Subject<number>();
const inputId = new r.BehaviorSubject<string | undefined>(undefined);
const inputVal = () =>
  pipe(
    inputId.getValue(),
    applySafe((id) => document.getElementById(id)),
    (val) => (val as HTMLInputElement)?.value
  );

const addOne = (num: number) => num + 1;
const minusOne = (num: number) => num - 1;

const both = {
  addOne,
  minusOne,
};

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never;

declare const desired: <A extends Record<string, (...a: any) => any>>(
  a: A
) => (...input: Parameters<A[keyof A]>) => { [K in keyof A]: ReturnType<A[K]> };

const num = (num: number) =>
  c("div", {
    style: {
      default:
        `margin-right: 10px; display:flex; justify-content:center; align-items: center; width: 100px; height:100px; background-color:${rainbow[num % rainbow.length]}` as unknown as CSSStyleDeclaration,
    },
    innerText: { default: String(num) },
  });

export const app = c("html", {}, [
  c("div", {}, [
    c("input", {
      type: { default: "text" },
      getId: applyNext(inputId),
    }),
    c("button", { innerText: { default: "render" }, onclick: () => arr.next(JSON.parse(inputVal() ?? "[]")) }),
    c("button", { innerText: { default: "prepend" }, onclick: () => prepend.next(777) }),
    c("div", {
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
  c("script", { src: { default: "./index.ts" } }),
]);
