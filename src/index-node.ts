import { app } from "./app";
import { renderToString } from "./lib/component/lib-node";
import fs from "fs/promises";

(async () => {
  const existingHtml = await fs.readFile("./src/index.html", { encoding: "utf-8" }).catch(() => "");
  const newHtml = renderToString(app);
  if (existingHtml !== newHtml) {
    console.log("writing file");
    await fs.writeFile("./src/index.html", newHtml);
  } else {
    console.log("no changes");
  }
})();
