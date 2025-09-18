import * as r from "rxjs";
import Observable = r.Observable;
import Subject = r.Subject;
import { Instantaneous, InstClose, InstEmit, InstInitPlain, InstValPlain } from "./types";

export const cold = <T>(
  subscribe?: (this: Observable<T>, subscriber: r.Subscriber<T>) => r.TeardownLogic
): Instantaneous<T> => {
  return r.defer(() => {
    const provenance = Symbol();
    return r.concat(
      r.of({
        type: "init",
        provenance,
      } satisfies InstInitPlain),
      new Observable(subscribe).pipe(
        r.map(
          (value) =>
            ({
              type: "value",
              init: {
                type: "init",
                provenance,
              } satisfies InstInitPlain,
              value,
            }) satisfies InstValPlain<T>
        )
      ),
      r.of({
        type: "close",
        init: { type: "init", provenance } satisfies InstInitPlain,
      } satisfies InstClose)
    );
  });
};

export class InstantSubject<T> extends Subject<InstEmit<T>> {
  protected _provenance: symbol;

  constructor() {
    // NOTE: This must be here to obscure Observable's constructor.
    super();
    this._provenance = Symbol();
  }

  /** @internal */
  protected _subscribe(subscriber: r.Subscriber<InstEmit<T>>): r.Subscription {
    const subscription = super["_subscribe" as string as "subscribe"](subscriber);
    !subscription.closed &&
      subscriber.next({
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain);
    return subscription;
  }

  instNext(value: T): void {
    super.next({
      type: "value",
      init: {
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain,
      value,
    } satisfies InstValPlain<T>);
  }

  next(val: InstEmit<T>): void {
    super.next(val);
  }

  complete(): void {
    super.next({
      type: "close",
      init: {
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain,
    } satisfies InstClose);
    super.complete();
  }
}
