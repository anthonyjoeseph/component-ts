import * as fc from "fast-check";
import { describe, test } from "node:test";
import * as assert from "node:assert/strict";
import { Ord as ordNumber } from "fp-ts/number";
import { arrayDiffEq, arrayDiffOrd } from "../src/lib/state/array/diff";
import { applyAction } from "../src/lib/state/array/domAction";

describe("array diff", () => {
  test("unordered", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.array(fc.integer()), (prev, current) =>
        assert.deepStrictEqual(
          current,
          arrayDiffEq(prev, current).reduce((working, current) => applyAction(working, current), prev)
        )
      )
    );
  });

  test("ordered", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.array(fc.integer()), (prev, current) =>
        assert.deepStrictEqual(
          current.sort(),
          arrayDiffOrd(prev.sort() as any, current.sort() as any, ordNumber).reduce(
            (working, current) => applyAction(working, current),
            prev
          )
        )
      )
    );
  });
});

/**
 * 
const testAppend = arrayDiffEq([0, 1, 2], [0, 1, 2, 3]);

const testPrepend = arrayDiffEq([0, 1, 2], [-1, 0, 1, 2]);

const testReplace = arrayDiffEq([0, 1, 2], [0, 10, 11, 12, 2]);

const prev = [0, 1, 2, 3, 4, 5, 6, 7];
const current = [0, 7, 9, 6, 9, 5, 1, 2, 3, 4];

const testMoveBack = arrayDiffEq(prev, current);

const testMoveForward = arrayDiffEq([0, 1, 2, 3, 4, 5, 6, 7], [0, 4, 5, 6, 3, 9, 2, 9, 1, 7]);

console.log(JSON.stringify({ testMoveBack }, null, 2));
 */
