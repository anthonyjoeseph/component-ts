import { range } from "lodash";
import { useState } from "react";

const Clicker = () => {
  const [num, setNum] = useState(0);
  return <button onClick={() => setNum(num + 1)}>{String(num)}</button>;
};

const GetApp = () => {
  const [val, setVal] = useState("");
  const [numButtons, setNumButtons] = useState(0);
  return (
    <div>
      {range(0, numButtons).map((key) => (
        <Clicker key={key} />
      ))}
      <input type="text" value={val} onChange={(e) => setVal(e.target.value)} />
      <button onClick={() => setNumButtons(parseInt(val))}>read text</button>
    </div>
  );
};

export const App = <GetApp />;
