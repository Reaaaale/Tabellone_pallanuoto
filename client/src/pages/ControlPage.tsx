import { useEffect, useState } from "react";
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

  const clockLabel = snapshot ? formatClock(snapshot.clock.remainingMs) : "00:00";
  const running = snapshot?.clock.running ?? false;

  useEffect(()=> {
    const onKeyDown = (event:KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      if (event.code === "Space") {
        event.preventDefault();
        send({ type: running ? "pause_clock" : "start_clock" });
      }
    };
    
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, [running, send]);

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

      const prev = snapshot?.teams[teamId].info.players.find((p) => p.number === number);
      return { number, name, ejections: prev?.ejections ?? 0 };
    })
    .filter((p): p is { number: number; name: string; ejections: number } => Boolean(p));

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

  const setEjections = (teamId: TeamSide, playerNumber: number, ejections: number) => {
    send({ type: "set_player_ejections", payload: { teamId, playerNumber, ejections } });
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

  const updateTeamInfo = (teamId: TeamSide, partial: { name?: string; logoUrl?: string }) => {
    const current = snapshot?.teams[teamId].info;
    send({
      type: "set_team_info",
      payload: {
        teamId,
        name: partial.name ?? current?.name,
        logoUrl: partial.logoUrl ?? current?.logoUrl,
      },
    });
  };

  const renderRosterCard = (teamId: TeamSide) => (
    <div className="card" style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 8, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{teamId === "home" ? "Casa" : "Ospiti"}</div>
          <input
            placeholder="Nome squadra"
            defaultValue={snapshot?.teams[teamId].info.name}
            onBlur={(e) => updateTeamInfo(teamId, { name: e.target.value })}
          />
        </div>
        <input
          placeholder="URL logo"
          style={{ width: "50%" }}
          defaultValue={snapshot?.teams[teamId].info.logoUrl}
          onBlur={(e) => updateTeamInfo(teamId, { logoUrl: e.target.value })}
        />
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Caricati: {snapshot?.teams[teamId].info.players.length ?? 0} giocatori
      </div>

      {isEditingRoster[teamId] ? (
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: 0 }}>
          <label>Roster (numero nome, uno per riga)</label>
          <textarea
            style={{
              width: "100%",
              height: 140,
              marginTop: 4,
              background: "rgba(255,255,255,0.05)",
              color: "#f7f7f7",
              borderRadius: 10,
              padding: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              resize: "vertical",
            }}
            value={rosterText[teamId]}
            onChange={(e) => setRosterText({ ...rosterText, [teamId]: e.target.value })}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setIsEditingRoster((prev) => ({ ...prev, [teamId]: false }));
                setRosterText((prev) => ({
                  ...prev,
                  [teamId]:
                    snapshot?.teams[teamId].info.players
                      .map((p) => `${p.number} ${p.name}`)
                      .join("\n") ?? "",
                }));
              }}
            >
              Annulla
            </button>
            <button type="button" className="btn primary" onClick={() => submitRoster(teamId)}>
              Salva roster {teamId === "home" ? "Casa" : "Ospiti"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {(() => {
            const players = snapshot?.teams[teamId].info.players ?? [];
            const splitIndex = Math.ceil(players.length / 2);
            const left = players.slice(0, splitIndex);
            const right = players.slice(splitIndex);

            const renderPlayer = (p: { number: number; name: string; ejections: number }) => {
              const colors = [
                p.ejections >= 1 ? "#f6c744" : "rgba(255,255,255,0.15)",
                p.ejections >= 2 ? "#f6c744" : "rgba(255,255,255,0.15)",
                p.ejections >= 3 ? "#e63946" : "rgba(255,255,255,0.15)",
              ];
            const alreadyActive = snapshot?.expulsions.some(
              (e) => e.teamId === teamId && e.playerNumber === p.number
            );

            return (
              <div
                key={p.number}
                style={{
                  display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    padding: "6px 8px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    #{p.number} {p.name}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0, 1, 2].map((idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          const level = idx + 1;
                          const next = p.ejections === level ? level - 1 : level;
                          setEjections(teamId, p.number, next);
                          if (next > p.ejections && next <= 2 && !alreadyActive) {
                            startExpulsion(teamId, p.number);
                          }
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          display: "inline-block",
                          background: colors[idx],
                          cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                        title={`Espulsioni: ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <>
                <div style={{ display: "grid", gap: 6 }}>{left.map(renderPlayer)}</div>
                <div style={{ display: "grid", gap: 6 }}>{right.map(renderPlayer)}</div>
              </>
            );
          })()}
          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setIsEditingRoster((prev) => ({ ...prev, [teamId]: true }));
                setRosterText((prev) => ({
                  ...prev,
                  [teamId]:
                    snapshot?.teams[teamId].info.players
                      .map((p) => `${p.number} ${p.name}`)
                      .join("\n") ?? "",
                }));
              }}
            >
              Modifica roster
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1800,
        margin: "0 auto",
        height: "100vh",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 12,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Connessione</div>
          <div style={{ fontWeight: 700 }}>
            {status === "open" ? "Online" : status === "connecting" ? "Connessione..." : "Offline"}
          </div>
          {error && <div style={{ color: "#ff7f50" }}>{error}</div>}
        </div>
        <div style={{ textAlign: "right", opacity: 0.7, fontSize: 12 }}>Controllo Gara</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", gap: 12, minHeight: 0 }}>
        {renderRosterCard("home")}

        <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 10, minHeight: 0 }}>
          <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Casa</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{snapshot?.teams.home.info.name}</div>
              <div style={{ fontSize: 48, fontWeight: 900 }}>{snapshot?.teams.home.score ?? 0}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button className="btn primary" onClick={() => send({ type: "goal", payload: { teamId: "home" } })}>
                  Goal Casa
                </button>
                <button
                  className="btn ghost"
                  disabled={(snapshot?.teams.home.score ?? 0) <= 0}
                  onClick={() => send({ type: "undo_goal", payload: { teamId: "home" } })}
                >
                  -1 Casa
                </button>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Tempo</div>
              <div style={{ fontSize: 56, fontWeight: 900 }}>{clockLabel}</div>
              <div style={{ fontSize: 14 }}>Periodo {snapshot?.period ?? "-"}</div>
              <button
                className="btn primary"
                style={{ marginTop: 8, minWidth: 140 }}
                onClick={() => send({ type: running ? "pause_clock" : "start_clock" })}
              >
                {running ? "⏸ Pausa" : "▶️ Avvia"}
              </button>
              <button className="btn ghost" style={{ marginTop: 6 }} onClick={() => send({ type: "reset_clock" })}>
                ⏹ Reset
              </button>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Ospiti</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{snapshot?.teams.away.info.name}</div>
              <div style={{ fontSize: 48, fontWeight: 900 }}>{snapshot?.teams.away.score ?? 0}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button className="btn primary" onClick={() => send({ type: "goal", payload: { teamId: "away" } })}>
                  Goal Ospiti
                </button>
                <button
                  className="btn ghost"
                  disabled={(snapshot?.teams.away.score ?? 0) <= 0}
                  onClick={() => send({ type: "undo_goal", payload: { teamId: "away" } })}
                >
                  -1 Ospiti
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                style={{ width: 64 }}
              />
              <span>:</span>
              <input
                type="number"
                min={0}
                max={59}
                placeholder="Sec"
                value={manualSeconds}
                onChange={(e) => setManualSeconds(e.target.value)}
                style={{ width: 64 }}
              />
              <button className="btn ghost" onClick={setRemainingTime}>
                Imposta tempo
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Espulsioni</div>
            <div style={{ display: "grid", gap: 8 }}>
              {(snapshot?.expulsions ?? []).length > 0 ? (
                snapshot?.expulsions.map((exp) => {
                  const teamLabel = exp.teamId === "home" ? "Casa" : "Ospiti";
                  const player = snapshot?.teams[exp.teamId].info.players.find(
                    (p) => p.number === exp.playerNumber
                  );
                  const count = player?.ejections ?? 1;
                  const label = count >= 2 ? "Seconda espulsione" : "Prima espulsione";
                  return (
                    <div
                      key={exp.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {label} n. {exp.playerNumber} ({teamLabel})
                      </div>
                      <div style={{ fontWeight: 800 }}>{formatClock(exp.remainingMs)}</div>
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Nessuna espulsione attiva</div>
              )}

              {(() => {
                const definitives =
                  snapshot?.teams
                    ? (["home", "away"] as TeamSide[]).flatMap((teamId) =>
                        snapshot.teams[teamId].info.players
                          .filter((p) => p.ejections >= 3)
                          .map((p) => ({
                            teamId,
                            playerNumber: p.number,
                          }))
                      )
                    : [];

                if (definitives.length === 0) return null;

                return (
                  <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                    {definitives.map((item) => (
                      <div
                        key={`${item.teamId}-${item.playerNumber}`}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(230,57,70,0.15)",
                          border: "1px solid rgba(230,57,70,0.4)",
                          color: "#ffb3b3",
                          fontWeight: 800,
                        }}
                      >
                        Espulsione definitiva n. {item.playerNumber} ({item.teamId === "home" ? "Casa" : "Ospiti"})
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {renderRosterCard("away")}
      </div>
    </div>
  );
}

export default ControlPage;
