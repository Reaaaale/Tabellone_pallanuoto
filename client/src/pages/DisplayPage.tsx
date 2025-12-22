import { useEffect, useRef, useState } from "react";
import { useMatchChannel } from "../hooks/useMatchChannel";
import { formatClock } from "../utils/time";
import { TeamSide } from "@tabellone/shared";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000";

const palette = {
  bg: "radial-gradient(circle at 20% 20%, rgba(26,84,64,0.35), rgba(4,18,12,0.9)), linear-gradient(135deg, #02110b 0%, #052219 50%, #02110b 100%)",
  card: "rgba(12,32,25,0.85)",
  cardBorder: "rgba(91,225,175,0.12)",
  accent: "#5be1af",
  accentSoft: "rgba(91,225,175,0.15)",
  text: "#e8f5ef",
  muted: "rgba(232,245,239,0.65)",
  warning: "#e6b400",
  danger: "#e6525a",
};

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
        gap: 14,
        padding: "16px 18px",
        borderRadius: 16,
        background: palette.card,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 140,
          height: 140,
        }}
      >
        {logo ? (
          <img
            src={logo}
            alt={`${name} logo`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <span style={{ fontWeight: 800, fontSize: 18 }}>{side === "home" ? "CASA" : "OSP"}</span>
        )}
      </div>
      <div style={{ textTransform: "uppercase", fontWeight: 800, fontSize: 24, letterSpacing: 0.7, color: palette.text }}>
        {name ?? (side === "home" ? "Casa" : "Ospiti")}
      </div>
      <div style={{ fontSize: 48, fontWeight: 900, minWidth: 70, textAlign: "right", color: palette.accent }}>
        {score ?? 0}
      </div>
    </div>
  );
}

function PlayerList({
  players,
  side,
  coachName,
}: {
  players: { number: number; name: string; ejections: number; goals: number }[];
  side: TeamSide;
  coachName?: string;
}) {
  const sorted = [...players].sort((a, b) => a.number - b.number);
  const half = Math.ceil(sorted.length / 2);
  const left = sorted.slice(0, half);
  const right = sorted.slice(half);

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.18)",
        borderRadius: 12,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
        padding: 6,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
      }}
    >
      {players.length === 0 && (
        <div
          style={{
            gridColumn: "1 / -1",
            padding: "10px 12px",
            opacity: 0.6,
            fontSize: 16,
            color: palette.muted,
            textAlign: "center",
          }}
        >
          Nessun giocatore caricato
        </div>
      )}
      {/* coach central row if even number of players */}
      {coachName && players.length % 2 === 0 && players.length > 0 && (
        <div
          style={{
            gridColumn: "1 / -1",
            padding: "10px 12px",
            textAlign: "center",
            fontWeight: 800,
            color: palette.muted,
            borderRadius: 10,
            background: "rgba(255,255,255,0.03)",
            border: `1px dashed ${palette.cardBorder}`,
          }}
        >
          Allenatore: {coachName}
        </div>
      )}
      {[left, right].map((column, colIdx) => (
        <div key={colIdx} style={{ display: "grid", gap: 6 }}>
          {column.map((p) => (
            <div
              key={p.number}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr",
                alignItems: "center",
                padding: "5px 6px",
                background: p.number % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.05)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: side === "home" ? "#1faa59" : "#0f766e",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#0a0c0f",
                }}
              >
                {p.number}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                  color: palette.text,
                  minWidth: 0,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {p.goals > 0 && (
                    <span
                      style={{
                        minWidth: 20,
                        padding: "2px 6px",
                        borderRadius: 8,
                        background: palette.accentSoft,
                        color: palette.accent,
                        fontWeight: 800,
                        fontSize: 11,
                      }}
                      title={`${p.goals} gol`}
                    >
                      {p.goals}
                    </span>
                  )}
                  {[0, 1, 2].map((idx) => {
                    const active = p.ejections >= idx + 1;
                    const color =
                      idx === 2 ? (active ? "#e63946" : "rgba(255,255,255,0.18)") : active ? "#f6c744" : "rgba(255,255,255,0.18)";
                    return (
                      <span
                        key={idx}
                        style={{
                          width: 8,
                          height: 8,
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
          {/* coach as last item if odd player count */}
          {coachName && players.length % 2 === 1 && colIdx === 1 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr",
                alignItems: "center",
                padding: "5px 6px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.15)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: 12,
                  color: palette.text,
                  border: `1px solid ${palette.cardBorder}`,
                }}
              >
                ALL
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: palette.text,
                }}
              >
                {coachName}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DisplayPage() {
  const { snapshot } = useMatchChannel(WS_URL);
  const [showGoalVideo, setShowGoalVideo] = useState(false);
  const [goalVideoKey, setGoalVideoKey] = useState(0);
  const [goalVideoEnabled] = useState(false);
  const prevHomeScoreRef = useRef<number | null>(null);
  const goalTimerRef = useRef<number | null>(null);

  const clockLabel = snapshot ? formatClock(snapshot.clock.remainingMs) : "00:00";

  useEffect(() => {
    if (!snapshot) return;
    if (!goalVideoEnabled) {
      setShowGoalVideo(false);
      if (goalTimerRef.current !== null) {
        window.clearTimeout(goalTimerRef.current);
        goalTimerRef.current = null;
      }
      prevHomeScoreRef.current = snapshot.teams.home.score;
      return;
    }
    const score = snapshot.teams.home.score;
    const prev = prevHomeScoreRef.current;

    if (prev !== null && score > prev) {
      setGoalVideoKey(Date.now());
      setShowGoalVideo(true);
      if (goalTimerRef.current !== null) {
        window.clearTimeout(goalTimerRef.current);
      }
      goalTimerRef.current = window.setTimeout(() => {
        setShowGoalVideo(false);
      }, 5000);
    }

    prevHomeScoreRef.current = score;
  }, [snapshot, goalVideoEnabled]);

  useEffect(() => {
    if (!goalVideoEnabled) {
      setShowGoalVideo(false);
      if (goalTimerRef.current !== null) {
        window.clearTimeout(goalTimerRef.current);
        goalTimerRef.current = null;
      }
    }
    return () => {
      if (goalTimerRef.current !== null) {
        window.clearTimeout(goalTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: palette.bg,
        color: palette.text,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {goalVideoEnabled && showGoalVideo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#000",
            display: "grid",
            placeItems: "center",
          }}
        >
          <video
            key={goalVideoKey}
            src="/goal-home.mp4"
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: "100%",
          maxWidth: 960,
          maxHeight: 480,
          aspectRatio: "2 / 1",
          padding: "14px 16px",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          gap: 10,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 0.6,
            color: palette.muted,
          }}
        >
          <div style={{ color: palette.text }}>Periodo {snapshot?.period ?? "-"}</div>
          <div style={{ opacity: 0.65, fontSize: 14 }}>Gara in corso</div>
        </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.1fr 1fr",
              gap: 8,
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 6, minHeight: 0 }}>
            <TeamHeader
              side="home"
              name={snapshot?.teams.home.info.name}
              logo={snapshot?.teams.home.info.logoUrl}
              score={snapshot?.teams.home.score}
            />
            <PlayerList
              players={snapshot?.teams.home.info.players ?? []}
              side="home"
              coachName={snapshot?.teams.home.info.coachName}
            />
          </div>

          <div
            style={{
              background: "linear-gradient(180deg, rgba(91,225,175,0.1), rgba(12,32,25,0.85))",
              borderRadius: 16,
              border: `1px solid ${palette.cardBorder}`,
              padding: "12px 14px",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 8,
              textAlign: "center",
              minHeight: 0,
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.8, letterSpacing: 1, color: palette.muted }}>TEMPO</div>
            <div
              style={{
                fontSize: 96,
                fontWeight: 900,
                lineHeight: 0.95,
                whiteSpace: "nowrap",
                textShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              {clockLabel}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
                alignItems: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <div style={{ background: palette.accentSoft, borderRadius: 10, padding: "8px 6px" }}>
                {snapshot?.clock.running ? "IN CORSO" : "PAUSA"}
              </div>
              <div style={{ background: palette.accentSoft, borderRadius: 10, padding: "8px 6px" }}>
                Periodo {snapshot?.period ?? "-"}
              </div>
              <div style={{ background: palette.accentSoft, borderRadius: 10, padding: "8px 6px" }}>
                TO Casa {snapshot?.teams.home.timeoutsRemaining ?? 3} / Osp {snapshot?.teams.away.timeoutsRemaining ?? 3}
              </div>
            </div>
            {snapshot?.expulsions.length ? (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                {snapshot.expulsions.map((exp) => (
                  <div
                    key={exp.id}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.12)",
                      border: `1px solid ${palette.cardBorder}`,
                      fontWeight: 700,
                      boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
                    }}
                  >
                    {exp.teamId === "home" ? "CASA" : "OSP"} · #{exp.playerNumber} · {formatClock(exp.remainingMs)}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ opacity: 0.6, fontSize: 12, color: palette.muted }}>Nessuna espulsione attiva</div>
              )}
          </div>

          <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 6, minHeight: 0 }}>
            <TeamHeader
              side="away"
              name={snapshot?.teams.away.info.name}
              logo={snapshot?.teams.away.info.logoUrl}
              score={snapshot?.teams.away.score}
            />
            <PlayerList
              players={snapshot?.teams.away.info.players ?? []}
              side="away"
              coachName={snapshot?.teams.away.info.coachName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisplayPage;
