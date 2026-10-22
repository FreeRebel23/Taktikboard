import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Taktikboard from "./Taktikboard.jsx";
import GlobalStyle from "./ui/GlobalStyle.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GlobalStyle />
    <Taktikboard />
  </StrictMode>
);
