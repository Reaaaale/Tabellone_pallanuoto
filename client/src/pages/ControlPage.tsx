import { useEffect, useMemo, useState } from "react";
import { TeamSide } from "@tabellone/shared";
import { useMatchChannel } from "../hooks/useMatchChannel";
import { formatClock } from "../utils/time";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000";

function ControlPage() {
  const { snapshot, status, error, send } = useMatchChannel(WS_URL);
  const [rosterText, setRosterText] = useState<Record<TeamSide, string>>({
    home: "",
    away: "",
  });
  const [isEditingRoster, setIsEditingRoster] = useState<Record<TeamSide, boolean>>({
    home: false,
    away: false,
  });

  useEffect(() => {
    if (!snapshot) return;
    setRosterText((prev) => {
      const next: Record<TeamSide, string> = { ...prev };
      (["home", "away"] as TeamSide[]).forEach((teamId) => {
        if (!isEditingRoster[teamId]) {
          next[teamId] = snapshot.teams[teamId].info.players.map((p) => `${p.number} ${p.name}`).join("\n");
        }
      });
      return next;
    });
  }, [snapshot, isEditingRoster]);

  const expulsionPlayers = useMemo(() => {
    if (!snapshot) return { home: [], away: [] };
    return {
      home: snapshot.teams.home.info.players,
      away: snapshot.teams.away.info.players,
    };
  }, [snapshot]);

  const clockLabel = snapshot ? formatClock(snapshot.clock.remainingMs) : "00:00";
  const running = snapshot?.clock.running ?? false;

  const submitRoster = (teamId: TeamSide) => {
  // Debug: mostra esattamente cosa c'è nella textarea (anche caratteri invisibili)
  console.log("[submitRoster] teamId:", teamId);
  console.log("[submitRoster] RAW rosterText:", JSON.stringify(rosterText[teamId]));

  
  const normalize = (s: string) =>
    s
      .replace(/\u00A0/g, " ") // NBSP -> spazio normale
      .replace(/\s+/g, " ")    // collassa spazi/tab
      .trim();

  // Split righe + normalizzazione
  const lines = rosterText[teamId]
    .split("\n")
    .map(normalize)
    .filter(Boolean);

  
  const players = lines
    .map((line) => {
      const m = line.match(/^(\d+)\s+(.+)$/);
      if (!m) return undefined;

      const number = Number(m[1]);
      const name = m[2].trim();

      if (!Number.isFinite(number) || number <= 0) return undefined;
      if (!name) return undefined;

      return { number, name };
    })
    .filter((p): p is { number: number; name: string } => Boolean(p));

  console.log("[submitRoster] PARSED players:", players);

  // Se l'utente ha scritto qualcosa ma non è stato parsato nulla, avvisa
  if (players.length === 0 && lines.length > 0) {
    console.warn(
      "[submitRoster] Nessun giocatore parsato. Usa 'numero spazio nome' (es: '1 ROSSI') una riga per giocatore."
    );
  }

  // Invia al server
  send({ type: "set_roster", payload: { teamId, players } });
  setIsEditingRoster((prev) => ({ ...prev, [teamId]: false }));
};
  
  const startExpulsion = (teamId: TeamSide, playerNumber: number) => {
    if (!playerNumber) return;
    send({ type: "start_expulsion", payload: { teamId, playerNumber } });
  };
  // Gestione tempo manuale, se si rompe il timer risetta il tempo manualmente
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSeconds, setManualSeconds] = useState("");

  const setRemainingTime = () => {
    const mins = Number(manualMinutes) || 0;
    const secs = Number(manualSeconds) || 0;
    const totalMs = Math.max(0, (mins * 60 + secs) * 1000);
    send({ type: "set_remaining_time", payload: { remainingMs: totalMs } });
  };

  
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Connessione</div>
          <div style={{ fontWeight: 700 }}>
            {status === "open" ? "Online" : status === "connecting" ? "Connessione..." : "Offline"}
          </div>
          {error && <div style={{ color: "#ff7f50" }}>{error}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Tempo</div>
          <div style={{ fontSize: 48, fontWeight: 800 }}>{clockLabel}</div>
          <div style={{ fontSize: 14 }}>Periodo {snapshot?.period ?? "-"}</div>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <div className="card grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Casa</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{snapshot?.teams.home.info.name}</div>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{snapshot?.teams.home.score ?? 0}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button className="btn primary" onClick={() => send({ type: "goal", payload: { teamId: "home" } })}>
              Goal Casa
            </button>
          </div>
        </div>

        <div className="card grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Ospiti</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{snapshot?.teams.away.info.name}</div>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{snapshot?.teams.away.score ?? 0}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button className="btn primary" onClick={() => send({ type: "goal", payload: { teamId: "away" } })}>
              Goal Ospiti
            </button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", marginTop: 12 }}>
        <div className="card">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={() => send({ type: running ? "pause_clock" : "start_clock" })}>
              {running ? "⏸ Pausa" : "▶️ Avvia"}
            </button>
            <button className="btn ghost" onClick={() => send({ type: "reset_clock" })}>
              ⏹ Reset
            </button>
            <select
              value={snapshot?.period ?? 1}
              onChange={(e) => send({ type: "set_period", payload: { period: Number(e.target.value) } })}
            >
              {[1, 2, 3, 4].map((p) => (
                <option key={p} value={p}>
                  Periodo {p}
                </option>
              ))}
            </select>
            <button className="btn warn" onClick={() => send({ type: "timeout", payload: { teamId: "home" } })}>
              Timeout Casa ({snapshot?.teams.home.timeoutsRemaining ?? 3})
            </button>
            <button className="btn warn" onClick={() => send({ type: "timeout", payload: { teamId: "away" } })}>
              Timeout Ospiti ({snapshot?.teams.away.timeoutsRemaining ?? 3})
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              style={{ width: 70 }}
            />
            <span>:</span>
            <input
              type="number"
              min={0}
              max={59}
              placeholder="Sec"
              value={manualSeconds}
              onChange={(e) => setManualSeconds(e.target.value)}
              style={{ width: 70 }}
            />
            <button className="btn ghost" onClick={setRemainingTime}>
              Imposta tempo
            </button>
          </div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Espulsioni</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["home", "away"] as TeamSide[]).map((teamId) => (
              <div key={teamId} className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {teamId === "home" ? "Casa" : "Ospiti"}
                </div>
                <select
                  style={{ width: "100%", margin: "8px 0" }}
                  onChange={(e) => startExpulsion(teamId, Number(e.target.value))}
                  value=""
                >
                  <option value="">Seleziona giocatore</option>
                  {expulsionPlayers[teamId].map((p) => (
                    <option key={p.number} value={p.number}>
                      #{p.number} {p.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: "rgba(247,247,247,0.8)" }}>
                  Attive:{" "}
                  {snapshot?.expulsions
                    .filter((e) => e.teamId === teamId)
                    .map((e) => `#${e.playerNumber} (${formatClock(e.remainingMs)})`)
                    .join(", ") || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        {(["home", "away"] as TeamSide[]).map((teamId) => (
          <div key={teamId} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{teamId === "home" ? "Casa" : "Ospiti"}</div>
                <input
                  placeholder="Nome squadra"
                  defaultValue={snapshot?.teams[teamId].info.name}
                  onBlur={(e) => send({ type: "set_team_info", payload: { teamId, name: e.target.value } })}
                />
              </div>
              <input
                placeholder="URL logo"
                style={{ width: "50%" }}
                defaultValue={snapshot?.teams[teamId].info.logoUrl}
                onBlur={(e) => send({ type: "set_team_info", payload: { teamId, logoUrl: e.target.value } })}
              />
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Caricati: {snapshot?.teams[teamId].info.players.length ?? 0} giocatori
            </div>
            <div style={{ marginTop: 8 }}>
              <label>Roster (numero nome, uno per riga)</label>
              <textarea
                style={{
                  width: "100%",
                  height: 150,
                  marginTop: 4,
                  background: "rgba(255,255,255,0.05)",
                  color: "#f7f7f7",
                  borderRadius: 10,
                  padding: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  resize: "vertical",
                }}
                value={rosterText[teamId]}
                onFocus={() => setIsEditingRoster({ ...isEditingRoster, [teamId]: true })}
                //onBlur={() => setIsEditingRoster({ ...isEditingRoster, [teamId]: false })}
                onChange={(e) => setRosterText({ ...rosterText, [teamId]: e.target.value })}
              />
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <button type="button" className="btn ghost" onClick={() => submitRoster(teamId)}>
                  Salva roster {teamId === "home" ? "Casa" : "Ospiti"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ControlPage;
