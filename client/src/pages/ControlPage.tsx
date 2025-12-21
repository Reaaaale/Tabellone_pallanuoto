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

  const clockLabel = snapshot ? formatClock(snapshot.clock.remainingMs) : "00:00";
  const running = snapshot?.clock.running ?? false;

  const expulsionPlayers = useMemo(() => {
    if (!snapshot) return { home: [], away: [] };
    return {
      home: snapshot.teams.home.info.players,
      away: snapshot.teams.away.info.players,
    };
  }, [snapshot]);

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
      return { number, name, ejections: prev?.ejections ?? 0, goals: prev?.goals ?? 0 };
    })
    .filter((p): p is { number: number; name: string; ejections: number; goals: number } => Boolean(p));

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

  const [goalModal, setGoalModal] = useState<{ open: boolean; teamId: TeamSide | null }>({
    open: false,
    teamId: null,
  });

  const openGoalModal = (teamId: TeamSide) => setGoalModal({ open: true, teamId });
  const closeGoalModal = () => setGoalModal({ open: false, teamId: null });

  const submitGoal = (playerNumber?: number) => {
    if (!goalModal.teamId) return;
    send({ type: "goal", payload: { teamId: goalModal.teamId, playerNumber } });
    closeGoalModal();
  };
  // Gestione tempo manuale, se si rompe il timer risetta il tempo manualmente
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSeconds, setManualSeconds] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(0);
  const [timeoutRunning, setTimeoutRunning] = useState(false);
  const TIMEOUT_DURATION = 60_000;

  const setRemainingTime = () => {
    const mins = Number(manualMinutes) || 0;
    const secs = Number(manualSeconds) || 0;
    const totalMs = Math.max(0, (mins * 60 + secs) * 1000);
    send({ type: "set_remaining_time", payload: { remainingMs: totalMs } });
  };

  useEffect(() => {
    if (!timeoutRunning) return;
    const id = window.setInterval(() => {
      setTimeoutMs((prev) => {
        const next = Math.max(0, prev - 200);
        if (next === 0) setTimeoutRunning(false);
        return next;
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [timeoutRunning]);

  const triggerTimeout = (teamId: TeamSide) => {
    send({ type: "timeout", payload: { teamId } });
    setTimeoutMs(TIMEOUT_DURATION);
    setTimeoutRunning(true);
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

  const renderRosterCard = (teamId: TeamSide) => {
    const accent = teamId === "home" ? "#34d399" : "#60a5fa";
    return (
    <div className="card" style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 8, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{teamId === "home" ? "Casa" : "Ospiti"}</div>
        <div style={{ fontWeight: 800, fontSize: 20 }}>{snapshot?.teams[teamId].info.name}</div>
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
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    background: accent,
                    color: "#0c1218",
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                  }}
                >
                  {p.number}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
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
          <div style={{ gridColumn: "1 / -1", textAlign: "center" }}>
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
  };

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1800,
        margin: "0 auto",
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "auto auto auto 1fr",
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
        <div style={{ textAlign: "right", opacity: 0.7, fontSize: 12 }}>Controllo gara</div>
      </header>

      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr 1fr",
          gap: 16,
          alignItems: "center",
          background: "linear-gradient(135deg, #111720, #0c1218)",
          padding: 20,
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Casa</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{snapshot?.teams.home.info.name}</div>
          <div style={{ fontSize: 58, fontWeight: 900, color: "#8efac5" }}>{snapshot?.teams.home.score ?? 0}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={() => openGoalModal("home")} style={{ minWidth: 120 }}>
              Goal Casa
            </button>
            <button
              className="btn ghost"
              disabled={(snapshot?.teams.home.score ?? 0) <= 0}
              onClick={() => send({ type: "undo_goal", payload: { teamId: "home" } })}
              style={{ minWidth: 90 }}
            >
              -1
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Tempo</div>
          <div style={{ fontSize: 74, fontWeight: 900 }}>{clockLabel}</div>
          <div style={{ fontSize: 14 }}>Periodo {snapshot?.period ?? "-"}</div>
          <div
            style={{
              marginTop: 4,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "grid",
              gap: 4,
              justifyItems: "center",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75 }}>Timer timeout</div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: 1,
                fontVariantNumeric: "tabular-nums",
                color: timeoutRunning ? "#8efac5" : "rgba(247,247,247,0.6)",
              }}
            >
              {timeoutRunning ? formatClock(timeoutMs) : "—"}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn primary"
              style={{ minWidth: 140 }}
              onClick={() => send({ type: running ? "pause_clock" : "start_clock" })}
            >
              {running ? "⏸ Pausa" : "▶️ Avvia"}
            </button>
            <button className="btn ghost" onClick={() => send({ type: "reset_clock" })}>
              ⏹ Reset
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, textAlign: "right", justifyItems: "end" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Ospiti</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{snapshot?.teams.away.info.name}</div>
          <div style={{ fontSize: 58, fontWeight: 900, color: "#8efac5" }}>{snapshot?.teams.away.score ?? 0}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={() => openGoalModal("away")} style={{ minWidth: 120 }}>
              Goal Ospiti
            </button>
            <button
              className="btn ghost"
              disabled={(snapshot?.teams.away.score ?? 0) <= 0}
              onClick={() => send({ type: "undo_goal", payload: { teamId: "away" } })}
              style={{ minWidth: 90 }}
            >
              -1
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
          <button className="btn warn" onClick={() => triggerTimeout("home")}>
            Timeout Casa ({snapshot?.teams.home.timeoutsRemaining ?? 3})
          </button>
          <button className="btn warn" onClick={() => triggerTimeout("away")}>
            Timeout Ospiti ({snapshot?.teams.away.timeoutsRemaining ?? 3})
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setTimeoutRunning(false);
              setTimeoutMs(0);
              send({ type: "reset_timeouts" });
            }}
          >
            Reset timeout
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value)}
            style={{ width: 80 }}
          />
          <span style={{ opacity: 0.7 }}>:</span>
          <input
            type="number"
            min={0}
            max={59}
            placeholder="Sec"
            value={manualSeconds}
            onChange={(e) => setManualSeconds(e.target.value)}
            style={{ width: 80 }}
          />
          <button className="btn ghost" onClick={setRemainingTime}>
            Imposta tempo
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, minHeight: 0 }}>
        {renderRosterCard("home")}

        <div className="card" style={{ display: "grid", gap: 12, gridTemplateRows: "auto 1fr" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Espulsioni</div>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            {(snapshot?.expulsions ?? []).length > 0 ? (
              (snapshot?.expulsions ?? []).map((exp) => {
                const teamLabel = exp.teamId === "home" ? "Casa" : "Ospiti";
                const player = snapshot?.teams[exp.teamId].info.players.find((p) => p.number === exp.playerNumber);
                const count = player?.ejections ?? 1;
                const label = count >= 2 ? "Seconda espulsione" : "Prima espulsione";
                return (
                  <div
                    key={exp.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "linear-gradient(135deg, rgba(0,0,0,0.35), rgba(0,0,0,0.6))",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {label} n. {exp.playerNumber} ({teamLabel})
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 20,
                        letterSpacing: 2,
                        padding: "6px 10px",
                        borderRadius: 8,
                        background: "linear-gradient(180deg, #111, #050505)",
                        color: "#9ff4c5",
                        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)",
                        minWidth: 90,
                        textAlign: "center",
                      }}
                    >
                      {formatClock(exp.remainingMs)}
                    </div>
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
                <div style={{ display: "grid", gap: 6 }}>
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

        {renderRosterCard("away")}
      </div>

      {goalModal.open && goalModal.teamId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 3000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 540,
              width: "100%",
              background: "rgba(12,32,25,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>
                Gol {goalModal.teamId === "home" ? "Casa" : "Ospiti"}: scegli marcatore
              </div>
              <button className="btn ghost" onClick={closeGoalModal}>
                Chiudi
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(snapshot?.teams[goalModal.teamId].info.players ?? []).map((p) => (
                <button
                  key={p.number}
                  className="btn ghost"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    minWidth: 140,
                    justifyContent: "flex-start",
                  }}
                  onClick={() => submitGoal(p.number)}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.12)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                    }}
                  >
                    {p.number}
                  </span>
                  <span style={{ textAlign: "left" }}>{p.name}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn ghost" onClick={() => submitGoal(undefined)}>
                Solo +1 (senza marcatore)
              </button>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {snapshot?.teams[goalModal.teamId].info.players.length ?? 0} giocatori caricati
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ControlPage;
