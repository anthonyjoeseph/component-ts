import * as r from "rxjs";
import { nums } from "./hmr-module";

let hmrAccept = false;
const hmrDispose = new r.Subject<unknown>();

// npm install --save-dev @types/parcel-env
(() => {
  if (module.hot) {
    module.hot.dispose(() => hmrDispose.next(null));
    module.hot.accept(() => {
      hmrAccept = true;
      console.log("hmr accept");
    });
  }
})();

r.concat(
  r.of("init").pipe(
    r.delay(0),
    r.takeWhile(() => !hmrAccept)
  ),
  nums
)
  .pipe(
    r.concatMap((num, index) => (index === 0 ? r.of(num) : r.of(num).pipe(r.delay(2000)))),
    r.tap((num) => {
      const node = document.getElementById("main");
      node.innerText = num;
    }),
    r.takeUntil(hmrDispose)
  )
  .subscribe();
console.log(new Date());
