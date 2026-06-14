import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Taktikboard from "./Taktikboard.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Taktikboard />
  </StrictMode>
);
