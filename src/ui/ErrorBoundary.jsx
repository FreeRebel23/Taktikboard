import { Component } from "react";
import { backupObject, loadDrafts } from "../store/playStore.js";

/* Fängt unerwartete Fehler ab: statt weißer Seite eine Meldung mit Datensicherung
 * (gespeicherte Spielzüge + automatische Entwürfe). */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Taktikboard-Fehler", error, info?.componentStack); }

  download = () => {
    const data = { ...backupObject(), drafts: Object.values(loadDrafts()).map((d) => d.play) };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taktikboard-notfall-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const btn = { padding: "12px 16px", borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", border: "1px solid #39424B", background: "#232B32", color: "#E8E4DA" };
    return (
      <div role="alert" style={{ position: "fixed", inset: 0, background: "#14181C", color: "#E8E4DA", display: "grid", placeItems: "center", padding: 20,
        fontFamily: "'Archivo Narrow','Arial Narrow',system-ui,sans-serif" }}>
        <div style={{ maxWidth: 460, display: "grid", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Da ist etwas schiefgelaufen.</h1>
          <p style={{ margin: 0, lineHeight: 1.5, color: "#B9C2C9" }}>
            Deine gespeicherten Spielzüge und automatischen Entwürfe sind auf diesem Gerät noch vorhanden.
            Zur Sicherheit kannst du sie jetzt als Datei herunterladen und danach neu laden.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...btn, background: "#F2762E", color: "#16110C", border: "none" }} onClick={this.download}>Sicherung herunterladen</button>
            <button style={btn} onClick={() => location.reload()}>Neu laden</button>
          </div>
          <details style={{ fontSize: 12.5, color: "#6F7B84" }}>
            <summary>Technische Details</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error?.stack ?? this.state.error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
