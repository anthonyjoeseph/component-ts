import { createRoot } from "react-dom/client";
import { App } from "../apps/PlainApp";

const container = document.getElementById("app") as HTMLElement;
const root = createRoot(container);
root.render(<App external={{ id: "3" }} />);
