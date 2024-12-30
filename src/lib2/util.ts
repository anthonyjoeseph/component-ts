import type { Observable } from "rxjs";
import * as r from "rxjs";

export const createAsyncStart = (): Observable<unknown> => r.of(null).pipe(r.observeOn(r.asapScheduler));

export const sum = (nums: number[]): number => nums.reduce((acc, cur) => acc + cur, 0);
export const range = (start: number, end: number) =>
  new Array<number>(end - start).fill(0).map((_, index) => start + index);
