import { createContext, useContext } from "react";
/* Kompiliertes Play für Analyse-Ebenen (vermeidet Prop-Drilling durch die Szene). */
export const AnalysisContext = createContext(null);
export const useAnalysisContext = () => useContext(AnalysisContext);
