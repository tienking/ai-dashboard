import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Deployed build stamp (commit · build time), injected by vite.config.js.
const versionBadge = (
  <div style={{ position: "fixed", bottom: 6, left: 8, zIndex: 1, fontSize: 10, fontFamily: "var(--font-mono, monospace)", color: "var(--text-muted)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
    v {__APP_VERSION__}
  </div>
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    {versionBadge}
  </StrictMode>
);
