import * as r from "rxjs";
import * as e from "./event";

const f = r;
const g = e;

const ancestor1 = r.timer(0, 1000);
const ancestor2 = r.timer(500, 1000);
const one = e.fromObservable(ancestor1);
const two = e.fromObservable(ancestor2);
const both = e.of(one, two);
const merged = e.mergeAll(both);

//e.toObservable(merged).subscribe(console.log);
