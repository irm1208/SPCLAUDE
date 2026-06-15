import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@/hooks/use-theme"; // initialises data-theme on <html> before first render

createRoot(document.getElementById("root")!).render(<App />);
