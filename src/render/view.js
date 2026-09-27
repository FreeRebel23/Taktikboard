import { createContext, useContext } from "react";

/* Darstellungs-Orientierung.
   portrait:  Court-Koordinaten = Bildschirm (Korb oben)
   landscape: Ganzfeld quer (Tablet/Desktop). Bildschirm X = y, Y = 150 − x,
              d. h. der obere Korb liegt links.
   Pseudo-3D-Effekte (Anheben, Schatten, Ballhöhe) und Texte sind Bildschirm-
   Konzepte; sv() übersetzt einen Bildschirmvektor in Court-Koordinaten. */

export const PORTRAIT = { landscape: false, textRot: 0, sv: (dx, dy) => ({ x: dx, y: dy }) };
export const LANDSCAPE = { landscape: true, textRot: 90, sv: (dx, dy) => ({ x: -dy, y: dx }) };

export const LANDSCAPE_MATRIX = "matrix(0,-1,1,0,0,150)";

export const ViewContext = createContext(PORTRAIT);
export const useView = () => useContext(ViewContext);
