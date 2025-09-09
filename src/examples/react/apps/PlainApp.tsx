import range from "lodash/range";
import { useEffect, useState } from "react";

const Clicker = () => {
  const [num, setNum] = useState(0);
  return (
    <button
      onClick={() => {
        setNum(num + 1);
      }}
    >
      {String(num)}
    </button>
  );
};

export const GetApp = ({ external }: { external: { id: string } }) => {
  const [val, setVal] = useState("");
  const [numButtons, setNumButtons] = useState(0);
  useEffect(() => {
    console.log("changed!");
  }, []);
  return (
    <div>
      {range(0, numButtons).map((key) => (
        <Clicker key={key} />
      ))}
      <h3>{external.id}</h3>
      <input type="text" value={val} onChange={(e) => setVal(e.target.value)} />
      <button onClick={() => setNumButtons(parseInt(val))}>read text omg dude</button>
    </div>
  );
};

export const App = ({ external }: { external: { id: string } }) => <GetApp external={external} />;
