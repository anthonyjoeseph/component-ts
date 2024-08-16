import { getPatch, applyPatch } from "fast-array-diff";

const oldArray = [0, 1, 2, 3, 4, 5];
const newArray = [0, 1, 2, 4, 5, 3, 7, 9];

const patch = getPatch(oldArray, newArray);

const applied = applyPatch(oldArray, patch);

console.log("done");
