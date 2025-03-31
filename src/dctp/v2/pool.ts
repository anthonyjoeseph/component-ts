import * as r from "rxjs";

// a game of one-dimensional pool

type O<A> = r.Observable<A>;

declare const leftKey: O<Time>;
declare const rightKey: O<Time>;

const playerInput: O<[Time, Velocity]> = r.merge(
  // a "null" starting input
  r.of([0, 0] as [Time, Velocity]),
  leftKey.pipe(r.map((time) => [time, -1] as [Time, Velocity])),
  rightKey.pipe(r.map((time) => [time, 1] as [Time, Velocity]))
);

type GameState = { left: ObjectState; player: ObjectState; right: ObjectState };

type Frame = (time: Time) => GameState;

type Position = number;
type Velocity = number;
type ObjectState = { position: Position; velocity: Velocity };

type Time = number;

const getFrame =
  (playerVelocity: Velocity, startState: GameState): Frame =>
  (time): GameState => {
    return undefined as any;
  };

const initialState: GameState = {
  left: { position: 5, velocity: 0 },
  player: { position: 10, velocity: 0 },
  right: { position: 15, velocity: 0 },
};

const game: O<(time: Time) => [Position, Position, Position]> = playerInput.pipe(
  r.scan(
    ([_, prevPrevState], [time, input]): [Frame, GameState] => {
      // preserve intermediary state
      // avoids a leak where 'prevFrame' is called recursively n times,
      // where n is the number of "inputs" emissions so far
      const prevState = getFrame(input, prevPrevState)(time);
      return [getFrame(input, prevState), prevState];
    },

    // constant fn returning starting positions
    [() => initialState, initialState] as [Frame, GameState]
  ),
  r.map(([frame, _]: [Frame, GameState]) => {
    return (time: number) => {
      const states = frame(time);
      return [states.left.position, states.player.position, states.right.position];
    };
  })
);
