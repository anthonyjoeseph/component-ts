import * as B from "../lib/state/behavior";

const root = {
  ...B.keysFromDefault({
    one: "abc",
    two: 123,
  }),
  three: B.keysFromDefault({
    four: "def",
    five: 456,
  }),
};

const fullObj = B.struct({
  one: root.one,
  two: root.two,
  three: B.struct(root.three),
});
type State = B.TypeOf<typeof fullObj>;

fullObj.subscribe((val) => console.log("full", val));

root.three.five.subscribe((val) => console.log("three.five", val));

fullObj.next({
  one: "zyx",
  two: 987,
  three: {
    four: "wvu",
    five: 890,
  },
});
