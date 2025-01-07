export type NonBlockingDone<A> = {
  type: "done";
  value: A;
};
export type NonBlockingEstimate = {
  type: "estimate";
  timeNeeded: number;
};
export type NonBlockingYield = {
  type: "yield";
};
export type NonBlockingEmission<A> = NonBlockingDone<A> | NonBlockingEstimate | NonBlockingYield;

export type NonBlockingGenerator<A> = Generator<NonBlockingEmission<A>, never, number | undefined>;

/**
 * Generalized function simulating react's "concurrent mode" execution.
 * Used to prevent heavy cpu-bound operations from blocking the main thread.
 * They prefer `setImmediate` to `MessageChannel`, and have determined that `requestIdleCallback` isn't aggressive enough.
 * Also, setInterval clamps at roughly 4ms.
 * 
 * 
 * We use a synchronous generator as a simple-ish interface
 * 
 * @param generator The interruptible process running the required work
 * @param millisPerCycle How long to wait before yielding to the main thread
 * @param timeout Used by requestIdleCallback for ... something. I can't remember
 * @returns The value produced by the interruptible process
 */
export const nonBlockingWork = <A>(
  generator: NonBlockingGenerator<A>,
  millisPerCycle = 10,
  timeout?: number
): Promise<A> => {
  if (typeof setImmediate === "function") {
    return new Promise<A>((resolve) => {
      const workLoop = () => {
        const start = new Date().getTime();
        while () {

        }
        const { value: yielded } = generator.next(undefined);
        if (yielded.type === "done") {
          resolve(yielded.value);
        } else {
          setImmediate(workLoop);
        }
      };
      workLoop();
    });
  } else if (typeof MessageChannel !== undefined) {
  } else if (window !== undefined && typeof window?.requestIdleCallback === "function") {
    return new Promise<A>((resolve) => {
      const workLoop: IdleRequestCallback = ({ timeRemaining, didTimeout }) => {
        while () {
          const { value: yielded } = generator.next(undefined);
          if (yielded.type === "done") {
            resolve(yielded.value);
          } else if (yielded.type === "estimate") {
            window.requestIdleCallback(workLoop, { timeout });
          } else {
            window.requestIdleCallback(workLoop, { timeout });
          }
        }
      };
      const start = new Date().getTime();
      workLoop({ timeRemaining: () => millisPerCycle - (new Date().getTime() - start), didTimeout: undefined as any });
    });
  }
  return new Promise((resolve) => {});
};