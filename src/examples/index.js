import { app } from "./app";
import { hydrate } from "./lib/component/dom/hydrate";

hydrate(app).subscribe(console.log);
