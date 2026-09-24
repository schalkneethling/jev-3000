import "./style.css";
import { setupPanels } from "./ui/panels.ts";
import { setupWarm } from "./ui/warm.ts";

const warm = setupWarm(document);
setupPanels(document, { onAnswered: warm.noteAnswered });
