import * as r from "rxjs";
import { v4 as uuidv4 } from "uuid";

export const hmr = <A>(parentModule: NodeModule): r.MonoTypeOperatorFunction<A> => {
  const uniqueId = uuidv4();
  let currentObs = new r.Subject<r.Observable<A>>();
  let isReloaded = false;

  if (parentModule.hot) {
    parentModule.hot.dispose((data) => {
      const exportPair = Object.entries(parentModule.exports).find(
        ([, value]) => (value as any)?.uniqueId === uniqueId
      );
      if (exportPair) {
        data[exportPair[0]] = currentObs;
      }
    });
    parentModule.hot.accept(() => {
      isReloaded = true;
      const exportPair = Object.entries(parentModule.exports).find(
        ([, value]) => (value as any)?.uniqueId === uniqueId
      );
      if (exportPair) {
        currentObs = parentModule.hot.data[exportPair[0]];
      }
    });
  }
  return (obs) => {
    setTimeout(() => {
      currentObs.next(obs);
    }, 0);
    const retval = currentObs.pipe(
      r.switchMap((obs) => obs),
      r.takeWhile(() => !isReloaded)
    );
    (retval as any).uniqueId = uniqueId;
    return retval;
  };
};
