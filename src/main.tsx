import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./cafe.css";
import "./serving.css";
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
