import { OFF_COLOR } from "../court/constants.js";

/* Globale Styles für alle Ansichten (Animationen, Fokus, Regler) */
export default function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;700&display=swap');
      input[type=range]{accent-color:${OFF_COLOR};}
      ::-webkit-scrollbar{height:0;width:0;}
      button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible{outline:2px solid ${OFF_COLOR};outline-offset:2px;}
      @keyframes recpulse{0%,100%{opacity:1;}50%{opacity:0.25;}}
      @keyframes tbpulse{0%,100%{opacity:1;}50%{opacity:0.35;}}
      @keyframes tbspin{to{transform:rotate(360deg);}}
      .tb-pulse{animation:tbpulse 0.9s ease-in-out infinite;}
      .tb-spin{animation:tbspin 6s linear infinite;transform-box:view-box;}
      @media (prefers-reduced-motion: reduce){.tb-pulse,.tb-spin{animation:none;}}
    `}</style>
  );
}
