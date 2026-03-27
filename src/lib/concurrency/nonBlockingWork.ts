export type NonBlockingYield = {
  type: "yield";
  nextStepTimeEstimate?: number
};
export type NonBlockingDone<A> = {
  type: "done";
  value: A;
};

export type NonBlockingGenerator<A> = Generator<NonBlockingYield, NonBlockingDone<A>, number>;


/**
 * Generalized function simulating react's "concurrent mode" execution.
 * Used to prevent heavy cpu-bound operations from blocking the main thread.
 * They prefer `setImmediate` to `MessageChannel`, and have determined that `requestIdleCallback` isn't aggressive enough.
 * Also, setInterval clamps at roughly 4ms.
 * 
 * https://github.com/facebook/react/blob/3cb2c42013eda273ac449126ab9fcc115a09d39d/packages/scheduler/src/forks/Scheduler.js#L517
 * 
 * Alternately, we might try `queueMicrotask`: https://github.com/facebook/react/blob/3cb2c42013eda273ac449126ab9fcc115a09d39d/packages/react/src/ReactAct.js#L361
 * 
 * I guess requestIdleCallback wasn't as "aggressive" as the react team wanted https://github.com/facebook/react/issues/11171#issuecomment-417349573
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
  timeout = Number.MAX_VALUE,
  workPeriodMillis = 10,
): Promise<A> => {
  const postpone = (work: () => void) => {
    if (typeof setImmediate === "function") {
      setImmediate(work);
    } else if (typeof MessageChannel !== "undefined") {
      const channel = new MessageChannel();
      const port = channel.port2;
      channel.port1.onmessage = work;
      port.postMessage(null);
    } else {
      setTimeout(work, 0);
    }
  }

  return new Promise<A>((resolve) => {
    const startTime = new Date().getTime();
    const workLoop = () => {
      const periodStartTime = new Date().getTime();
      let currentTime = periodStartTime;
      let resolved = false;
      while (currentTime - periodStartTime < workPeriodMillis || timeout < (currentTime - startTime)) {
        const { value: yielded } = generator.next(workPeriodMillis - (currentTime - periodStartTime));
        if (yielded.type === "done") {
          resolved = true;
          resolve(yielded.value);
          break
        } else if (
          yielded.nextStepTimeEstimate !== undefined &&
          yielded.nextStepTimeEstimate > (currentTime - periodStartTime) &&
          (currentTime - startTime) <= timeout
        ) {
          break;
        }
        currentTime = new Date().getTime();
      }
      if (!resolved) {
        postpone(workLoop);
      }
    };
    postpone(workLoop);
  });
};

export const nonBlockingIdleWork =  <A>(
  generator: NonBlockingGenerator<A>,
  timeout?: number,
  workPeriodMillis?: number,
): Promise<A> => {
  if (window !== undefined && typeof window?.requestIdleCallback === "function") {
    return new Promise<A>((resolve) => {
      const startTime = new Date().getTime();
      const workLoop: IdleRequestCallback = ({ timeRemaining: getTimeRemaining, didTimeout }) => {
        let timeRemaining: number = getTimeRemaining();
        let resolved = false;
        while (timeRemaining > 0 || didTimeout) {
          const { value: yielded } = generator.next(timeRemaining);
          if (yielded.type === "done") {
            resolved = true;
            resolve(yielded.value);
            break;
          } else if (
            yielded.nextStepTimeEstimate !== undefined && 
            yielded.nextStepTimeEstimate > timeRemaining && 
            !didTimeout
          ) {
            break;
          }
          timeRemaining = getTimeRemaining();
        }
        if (!resolved) {
          window.requestIdleCallback(
            workLoop,
            { 
              timeout: timeout ? timeout - (new Date().getTime() - startTime) : undefined 
            }
          );
        }
      };
      window.requestIdleCallback(workLoop, { timeout });
    });
  } else {
    return nonBlockingWork(generator, timeout, workPeriodMillis);
  }
};