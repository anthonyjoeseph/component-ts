import * as r from "rxjs";
import Observable = r.Observable;
import Subject = r.Subject;
import { Instantaneous, InstClose, InstEmit, InstInitPlain, InstValPlain } from "./types";
import { Observer, Operator, Subscriber, Subscription, TeardownLogic } from "rxjs";
import { AnonymousSubject } from "rxjs/internal/Subject";
import { errorContext } from "rxjs/internal/util/errorContext";
import { EMPTY_SUBSCRIPTION } from "rxjs/internal/Subscription";
import { arrRemove } from "rxjs/internal/util/arrRemove";

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

export class InstantSubject2<T> extends Subject<InstEmit<T>> {
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

  completeWithoutEmittingClose() {
    super.complete();
  }
}

export class InstantSubject<T> extends Observable<InstEmit<T>> implements r.SubscriptionLike {
  protected _provenance: symbol;
  public closed: boolean;
  internalSubject: Subject<InstEmit<T>>;

  constructor() {
    super();
    this.internalSubject = new Subject<InstEmit<T>>();
    this.closed = false;
    this._provenance = Symbol();
  }

  subscribe(observerOrNext?: Partial<Observer<InstEmit<T>>> | ((value: InstEmit<T>) => void) | null): Subscription;
  /** @deprecated Instead of passing separate callback arguments, use an observer argument. Signatures taking separate callback arguments will be removed in v8. Details: https://rxjs.dev/deprecations/subscribe-arguments */
  subscribe(
    next?: ((value: InstEmit<T>) => void) | null,
    error?: ((error: any) => void) | null,
    complete?: (() => void) | null
  ): Subscription;
  subscribe(
    observerOrNext?: Partial<Observer<InstEmit<T>>> | ((value: InstEmit<T>) => void) | null,
    errorArg?: ((error: any) => void) | null,
    completeArg?: (() => void) | null
  ): r.Subscription {
    const next =
      observerOrNext === undefined
        ? undefined
        : observerOrNext == null
          ? undefined
          : typeof observerOrNext === "function"
            ? observerOrNext
            : observerOrNext["next"];
    const error =
      typeof observerOrNext !== "function" && observerOrNext != null
        ? observerOrNext["error"]
        : (errorArg ?? undefined);
    const complete =
      typeof observerOrNext !== "function" && observerOrNext != null
        ? observerOrNext["complete"]
        : (completeArg ?? undefined);
    return this.internalSubject
      .pipe(
        r.startWith({
          type: "init",
          provenance: this._provenance,
        } satisfies InstInitPlain)
      )
      .subscribe({
        next: (value) => {
          next?.(value);
        },
        error: (value) => {
          error?.(value);
        },
        complete: () => {
          complete?.();
        },
      });
  }

  subscribeInternal(observerOrNext: Partial<Observer<InstEmit<T>>>): r.Subscription {
    return this.internalSubject.subscribe({
      next: (value) => {
        observerOrNext.next?.(value);
      },
      error: (value) => {
        observerOrNext.error?.(value);
      },
      complete: () => {
        observerOrNext.complete?.();
      },
    });
  }

  unsubscribe(): void {
    this.closed = true;
    this.internalSubject.unsubscribe();
  }

  next(value: T) {
    this.internalSubject.next({
      type: "value",
      init: {
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain,
      value,
    } satisfies InstValPlain<T>);
  }

  error(err: any) {
    this.internalSubject.error(err);
  }

  complete() {
    this.internalSubject.next({
      type: "close",
      init: {
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain,
    } satisfies InstClose);
    this.closed = true;
    this.internalSubject.complete();
  }
}
