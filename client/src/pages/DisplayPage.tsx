import { useMatchChannel } from "../hooks/useMatchChannel";
import { formatClock } from "../utils/time";
import { TeamSide } from "@tabellone/shared";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000";

function TeamHeader({
  side,
  name,
  logo,
  score,
}: {
  side: TeamSide;
  name?: string;
  logo?: string;
  score?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 12,
          background: "rgba(0,0,0,0.3)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {logo ? (
          <img src={logo} alt={`${name} logo`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontWeight: 800, fontSize: 18 }}>{side === "home" ? "CASA" : "OSP"}</span>
        )}
      </div>
      <div style={{ textTransform: "uppercase", fontWeight: 800, fontSize: 22, letterSpacing: 0.5 }}>
        {name ?? (side === "home" ? "Casa" : "Ospiti")}
      </div>
      <div style={{ fontSize: 42, fontWeight: 900, minWidth: 70, textAlign: "right" }}>{score ?? 0}</div>
    </div>
  );
}

function PlayerList({
  players,
  side,
}: {
  players: { number: number; name: string; ejections: number }[];
  side: TeamSide;
}) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.2)",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
      }}
    >
      {players.length === 0 && (
        <div style={{ padding: "12px 14px", opacity: 0.6, fontSize: 18 }}>Nessun giocatore caricato</div>
      )}
      {players.map((p) => (
        <div
          key={p.number}
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr",
            alignItems: "center",
            padding: "10px 12px",
            background: p.number % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              background: side === "home" ? "#1faa59" : "#0f766e",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 22,
            color: "#0a0c0f",
          }}
        >
          {p.number}
        </div>
          <div style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>{p.name}</span>
            <span style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map((idx) => {
                const active = p.ejections >= idx + 1;
                const color =
                  idx === 2 ? (active ? "#e63946" : "rgba(255,255,255,0.18)") : active ? "#f6c744" : "rgba(255,255,255,0.18)";
                return (
                  <span
                    key={idx}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      display: "inline-block",
                      background: color,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                );
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DisplayPage() {
  const { snapshot } = useMatchChannel(WS_URL);

  const clockLabel = snapshot ? formatClock(snapshot.clock.remainingMs) : "00:00";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a1f14, #06341f 45%, #041610 100%)",
        color: "#e9f5ec",
        padding: "18px 24px",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 12,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 0.6,
        }}
      >
        <div>Periodo {snapshot?.period ?? "-"}</div>
        <div style={{ opacity: 0.75 }}>Tabellone Pallanuoto</div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr 1fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 10 }}>
          <TeamHeader
            side="home"
            name={snapshot?.teams.home.info.name}
            logo={snapshot?.teams.home.info.logoUrl}
            score={snapshot?.teams.home.score}
          />
          <PlayerList players={snapshot?.teams.home.info.players ?? []} side="home" />
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            borderRadius: 18,
            border: "2px solid rgba(255,255,255,0.12)",
            padding: "14px 18px",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            gap: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 18, opacity: 0.8, letterSpacing: 1 }}>TEMPO</div>
          <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 0.95 }}>{clockLabel}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              alignItems: "center",
              fontWeight: 700,
            }}
          >
            <div style={{ background: "#0a7f5a", borderRadius: 12, padding: "10px 8px" }}>
              {snapshot?.clock.running ? "IN CORSO" : "PAUSA"}
            </div>
            <div style={{ background: "#0a7f5a", borderRadius: 12, padding: "10px 8px" }}>
              Periodo {snapshot?.period ?? "-"}
            </div>
            <div style={{ background: "#0a7f5a", borderRadius: 12, padding: "10px 8px" }}>
              TO Casa {snapshot?.teams.home.timeoutsRemaining ?? 3} / Osp {snapshot?.teams.away.timeoutsRemaining ?? 3}
            </div>
          </div>
          {snapshot?.expulsions.length ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {snapshot.expulsions.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontWeight: 700,
                  }}
                >
                  {exp.teamId === "home" ? "CASA" : "OSP"} · #{exp.playerNumber} · {formatClock(exp.remainingMs)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.6, fontSize: 14 }}>Nessuna espulsione attiva</div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 10 }}>
          <TeamHeader
            side="away"
            name={snapshot?.teams.away.info.name}
            logo={snapshot?.teams.away.info.logoUrl}
            score={snapshot?.teams.away.score}
          />
          <PlayerList players={snapshot?.teams.away.info.players ?? []} side="away" />
        </div>
      </div>
    </div>
  );
}

export default DisplayPage;
