import { app } from "./app";
import { hydrate } from "./lib/component/lib-dom";

hydrate(app).subscribe(console.log);
