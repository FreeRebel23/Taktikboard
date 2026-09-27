/* Rendert einen Engine-Frame als Ebenenstapel über dem Court. */

import Player25D, { PlayerTrail } from "./Player25D.jsx";
import Ball25D, { PassFlight } from "./Ball25D.jsx";
import {
  TrapOverlay, LaneOverlay, LineOverlay, MatchupOverlay, FocusOverlay, DiagramOverlay,
} from "./PlayOverlays.jsx";

export default function PlayScene({ frame, diagram, showDef = true }) {
  const all = Object.values(frame.players);
  const visible = showDef ? all : all.filter((p) => p.team !== "defense");
  // Defense unten, Offense oben, Ballführerin zuletzt (Ball liegt über ihr)
  const ordered = [...visible].sort((a, b) =>
    (a.team === "defense" ? 0 : 1) - (b.team === "defense" ? 0 : 1) || (a.hasBall ? 1 : 0) - (b.hasBall ? 1 : 0));
  const players = frame.players;

  return (
    <g>
      {frame.lines.map((l) => <LineOverlay key={l.id} line={l} />)}
      {diagram && <DiagramOverlay items={showDef ? diagram : diagram.filter((d) => d.team !== "defense")} />}
      {showDef && <LaneOverlay lanes={frame.lanes} players={players} />}
      {showDef && <MatchupOverlay matchups={frame.matchups} players={players} />}
      {showDef && frame.traps.map((t) => <TrapOverlay key={t.target} trap={t} />)}
      {ordered.map((p) => <PlayerTrail key={`tr-${p.id}`} p={p} />)}
      <PassFlight ball={frame.ball} />
      {ordered.map((p) => <Player25D key={p.id} p={p} />)}
      <Ball25D ball={frame.ball} />
      <FocusOverlay focus={frame.focus} players={players} />
    </g>
  );
}
