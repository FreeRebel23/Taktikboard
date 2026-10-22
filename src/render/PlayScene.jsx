/* Rendert einen Engine-Frame als Ebenenstapel über dem Court.
 * player (optional): Spielerinnen-Modus – eigene Figur hervorgehoben, Rest leicht gedimmt.
 * view (optional):   Team-/Gruppenansicht – { focus: Set(ids), defenseLabels: "all"|"active"|"none" };
 *                    alle Fokus-Figuren gleichwertig, niemand wird zur Hintergrundfigur.
 * analysis (optional): zuschaltbare Analyse-Ebenen (Modell-Einschätzung). */

import Player25D, { PlayerTrail } from "./Player25D.jsx";
import Ball25D, { PassFlight } from "./Ball25D.jsx";
import {
  TrapOverlay, LaneOverlay, LineOverlay, MatchupOverlay, FocusOverlay, DiagramOverlay,
} from "./PlayOverlays.jsx";
import { MyPath, TargetGhost, WatchLine, MeLabel } from "./PlayerLayers.jsx";
import AnalysisLayers from "./AnalysisLayers.jsx";
import DefenseLayer, { ZoneAreas } from "./DefenseLayer.jsx";

export default function PlayScene({ frame, diagram, showDef = true, player = null, analysis = null, view = null }) {
  const all = Object.values(frame.players);
  const visible = showDef ? all : all.filter((p) => p.team !== "defense");
  const me = player?.me;
  // Defense unten, Offense oben, Ballführerin und eigene Figur zuletzt
  const rank = (p) => (p.team === "defense" ? 0 : 2) + (p.hasBall ? 1 : 0) + (p.id === me ? 4 : 0);
  const ordered = [...visible].sort((a, b) => rank(a) - rank(b));
  const players = frame.players;
  const focus = view?.focus ?? null;
  const isDim = (p) => (player ? !player.related.has(p.id) : focus ? !focus.has(p.id) : false) && !p.hasBall;

  const diag = diagram && (showDef ? diagram : diagram.filter((d) => d.team !== "defense"));
  const otherDiag = player ? diag?.filter((d) => d.player !== me) : focus ? diag?.filter((d) => !focus.has(d.player)) : diag;
  const focusDiag = focus && !player ? diag?.filter((d) => focus.has(d.player)) : null;
  const sysMatch = (m) => !m.state; // Zuständigkeiten der System-Verteidigung zeichnet DefenseLayer
  const watchTo = player?.watch === "ball" ? { x: frame.ball.x, y: frame.ball.y } : player?.watch ? players[player.watch] : null;

  return (
    <g>
      {showDef && <ZoneAreas zones={frame.zones} focus={focus ?? (player ? new Set([me]) : null)} />}
      {frame.lines.map((l) => <LineOverlay key={l.id} line={l} />)}
      {analysis && <AnalysisLayers frame={frame} analysis={analysis} />}
      {otherDiag && (
        <g opacity={player || focus ? 0.45 : 1}><DiagramOverlay items={otherDiag} /></g>
      )}
      {focusDiag && <DiagramOverlay items={focusDiag} />}
      {showDef && !player && <LaneOverlay lanes={frame.lanes} players={players} />}
      {showDef && <MatchupOverlay matchups={(player ? frame.matchups.filter((m) => m.defender === me || m.target === me) : frame.matchups).filter(sysMatch)} players={players} />}
      {showDef && frame.traps.map((t) => <TrapOverlay key={t.target} trap={t} />)}
      {player && <MyPath points={player.myPath} team={players[me].team} />}
      {ordered.map((p) => <PlayerTrail key={`tr-${p.id}`} p={p} />)}
      <PassFlight ball={frame.ball} />
      {player && <TargetGhost ghost={player.ghost} />}
      {ordered.map((p) => <Player25D key={p.id} p={p} dim={isDim(p)} me={p.id === me} phase={frame.t} />)}
      <Ball25D ball={frame.ball} />
      {showDef && (
        <DefenseLayer frame={frame}
          focus={focus ?? (player ? new Set([me, ...Object.values(players).filter((p) => p.defense?.resp === me).map((p) => p.id)]) : null)}
          labels={view?.defenseLabels ?? (player ? "all" : "active")} me={me} />
      )}
      {player && <WatchLine from={players[me]} to={watchTo} label={player.watchLabel} />}
      <FocusOverlay focus={player ? frame.focus.filter((f) => player.related.has(f.player)) : frame.focus} players={players} />
      {player && <MeLabel p={players[me]} />}
    </g>
  );
}
