import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CalculatorApp } from "./App";
import "./styles.css";
createRoot(document.getElementById("root")!).render(<StrictMode><CalculatorApp /></StrictMode>);
