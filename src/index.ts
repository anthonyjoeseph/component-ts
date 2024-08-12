import { createElement, renderToString } from "./lib-node";

const inputEl = createElement("input", { value: "value", onkeypress: "event" });

const divEl = createElement("div", { innerText: "value" });

const scriptEl = createElement("script", { src: "value" });
const htmlEl = createElement("html", {});

const app = htmlEl({}, [
  divEl({ innerText: { default: "parent element" } }, [
    divEl({ innerText: { default: "child element" } }),
    divEl({ innerText: { default: "child element #2" } }),
    inputEl({ value: { default: "default" }, onkeypress: () => {} }),
  ]),
  scriptEl({ src: { default: "index.ts" } }),
]);

console.log(renderToString(app));
