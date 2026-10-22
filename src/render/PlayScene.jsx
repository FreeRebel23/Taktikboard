/* Rendert einen Engine-Frame als Ebenenstapel über dem Court.
 * player (optional): Spielerinnen-Modus – eigene Figur hervorgehoben, Rest gedimmt.
 * analysis (optional): zuschaltbare Analyse-Ebenen (Modell-Einschätzung). */

import Player25D, { PlayerTrail } from "./Player25D.jsx";
import Ball25D, { PassFlight } from "./Ball25D.jsx";
import {
  TrapOverlay, LaneOverlay, LineOverlay, MatchupOverlay, FocusOverlay, DiagramOverlay,
} from "./PlayOverlays.jsx";
import { MyPath, TargetGhost, WatchLine, MeLabel } from "./PlayerLayers.jsx";
import AnalysisLayers from "./AnalysisLayers.jsx";

export default function PlayScene({ frame, diagram, showDef = true, player = null, analysis = null }) {
  const all = Object.values(frame.players);
  const visible = showDef ? all : all.filter((p) => p.team !== "defense");
  const me = player?.me;
  // Defense unten, Offense oben, Ballführerin und eigene Figur zuletzt
  const rank = (p) => (p.team === "defense" ? 0 : 2) + (p.hasBall ? 1 : 0) + (p.id === me ? 4 : 0);
  const ordered = [...visible].sort((a, b) => rank(a) - rank(b));
  const players = frame.players;
  const isDim = (p) => !!player && !player.related.has(p.id) && !p.hasBall;

  const diag = diagram && (showDef ? diagram : diagram.filter((d) => d.team !== "defense"));
  const otherDiag = player ? diag?.filter((d) => d.player !== me) : diag;
  const watchTo = player?.watch === "ball" ? { x: frame.ball.x, y: frame.ball.y } : player?.watch ? players[player.watch] : null;

  return (
    <g>
      {frame.lines.map((l) => <LineOverlay key={l.id} line={l} />)}
      {analysis && <AnalysisLayers frame={frame} analysis={analysis} />}
      {otherDiag && (
        <g opacity={player ? 0.45 : 1}><DiagramOverlay items={otherDiag} /></g>
      )}
      {showDef && !player && <LaneOverlay lanes={frame.lanes} players={players} />}
      {showDef && <MatchupOverlay matchups={player ? frame.matchups.filter((m) => m.defender === me || m.target === me) : frame.matchups} players={players} />}
      {showDef && frame.traps.map((t) => <TrapOverlay key={t.target} trap={t} />)}
      {player && <MyPath points={player.myPath} team={players[me].team} />}
      {ordered.map((p) => <PlayerTrail key={`tr-${p.id}`} p={p} />)}
      <PassFlight ball={frame.ball} />
      {player && <TargetGhost ghost={player.ghost} />}
      {ordered.map((p) => <Player25D key={p.id} p={p} dim={isDim(p)} me={p.id === me} phase={frame.t} />)}
      <Ball25D ball={frame.ball} />
      {player && <WatchLine from={players[me]} to={watchTo} label={player.watchLabel} />}
      <FocusOverlay focus={player ? frame.focus.filter((f) => player.related.has(f.player)) : frame.focus} players={players} />
      {player && <MeLabel p={players[me]} />}
    </g>
  );
}
