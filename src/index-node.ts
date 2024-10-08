import { renderToString } from "./lib/component/component";
import fs from "fs/promises";

(async () => {
  const appStr = "./app";
  const { app } = await import("./app");
  const existingHtml = await fs.readFile("./src/index.html", { encoding: "utf-8" }).catch(() => "");
  const newHtml = renderToString(app);
  if (existingHtml !== newHtml) {
    console.log("writing file");
    await fs.writeFile("./src/index.html", newHtml);
  } else {
    console.log("no changes");
  }
})();
