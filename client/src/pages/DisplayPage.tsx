import { useEffect, useRef, useState } from "react";
import { TeamSide } from "@tabellone/shared";
import { useMatchChannel } from "../hooks/useMatchChannel";
import { formatClock } from "../utils/time";

const WS_HOST = window.location.hostname || "127.0.0.1";
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${WS_HOST}:4000`;


// Palette centrale per sfondo, card, testi e accenti.
const palette = {
  bg: "radial-gradient(circle at 20% 20%, rgba(26,84,64,0.35), rgba(4,18,12,0.9)), linear-gradient(135deg, #02110b 0%, #052219 50%, #02110b 100%)",
  card: "rgba(12,32,25,0.82)",
  cardBorder: "rgba(91,225,175,0.14)",
  accent: "#5be1af",
  accentSoft: "rgba(91,225,175,0.16)",
  text: "#e8f5ef",
  muted: "rgba(232,245,239,0.7)",
};

type PlayerRow = { number: number; name: string; ejections: number; goals: number };

function TimeoutDots({ remaining = 0, alignRight }: { remaining?: number; alignRight?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: alignRight ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
      {[0, 1, 2].map((idx) => {
        const active = remaining > idx;
        return (
          <span
            key={idx}
            style={{
              width: 16,
              height: 6,
              borderRadius: 999,
              background: active ? palette.accent : "rgba(255,255,255,0.14)",
              border: `1px solid ${palette.cardBorder}`,
              boxShadow: active ? "0 0 8px rgba(91,225,175,0.3)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function TeamTile({
  side,
  name,
  logo,
  score,
  timeoutsRemaining,
}: {
  side: TeamSide;
  name?: string;
  logo?: string;
  score?: number;
  timeoutsRemaining?: number;
}) {
  const alignRight = side === "away";
  const sideLabel = side === "home" ? "Casa" : "Ospiti";

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.32))",
        borderRadius: 12,
        border: `1px solid ${palette.cardBorder}`,
        padding: "4px 8px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 40,
        boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {alignRight ? (
        <>
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 0.9,
              textAlign: "left",
              color: palette.accent,
              letterSpacing: -1,
              textShadow: "0 8px 20px rgba(0,0,0,0.4)",
              flexShrink: 0,
              marginTop: 8,
            }}
          >
            {score ?? 0}
          </div>

          <div style={{ textAlign: "right", minWidth: 0 }}>
            <div style={{ fontSize: 0, letterSpacing: 0.5, color: palette.muted, textTransform: "uppercase" }}>{sideLabel}</div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                textTransform: "uppercase",
                color: palette.text,
                textShadow: "0 6px 16px rgba(0,0,0,0.35)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name ?? sideLabel}
            </div>
            <TimeoutDots remaining={timeoutsRemaining ?? 0} alignRight />
          </div>

          {logo ? (
            <img src={logo} alt={`${name} logo`} style={{ maxHeight: 70, maxWidth: 90, objectFit: "contain", display: "block" }} />
          ) : (
            <span style={{ fontWeight: 800, fontSize: 20, color: palette.muted }}>{sideLabel}</span>
          )}
        </>
      ) : (
        <>
          {logo ? (
            <img src={logo} alt={`${name} logo`} style={{ maxHeight: 70, maxWidth: 90, objectFit: "contain", display: "block" }} />
          ) : (
            <span style={{ fontWeight: 800, fontSize: 20, color: palette.muted }}>{sideLabel}</span>
          )}

          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div style={{ fontSize: 0, letterSpacing: 0.5, color: palette.muted, textTransform: "uppercase" }}>{sideLabel}</div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                textTransform: "uppercase",
                color: palette.text,
                textShadow: "0 6px 16px rgba(0,0,0,0.35)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name ?? sideLabel}
            </div>
            <TimeoutDots remaining={timeoutsRemaining ?? 0} />
          </div>

          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 0.9,
              textAlign: "left",
              color: palette.accent,
              letterSpacing: -1,
              textShadow: "0 8px 20px rgba(0,0,0,0.4)",
              flexShrink: 0,
              marginTop: 8,
            }}
          >
            {score ?? 0}
          </div>
        </>
      )}
    </div>
  );
}

function PlayerList({ players, side, coachName }: { players: PlayerRow[]; side: TeamSide; coachName?: string }) {
  const sorted = [...players].sort((a, b) => a.number - b.number);
  const half = Math.ceil(sorted.length / 2);
  const left = sorted.slice(0, half);
  const right = sorted.slice(half);

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "18px 1fr",
    alignItems: "center",
    padding: "1px 2px",
    columnGap: 20,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 5,
    border: "1px solid rgba(255,255,255,0.05)",
  };

  const renderRow = (p: PlayerRow, label?: string) => (
    <div key={`${p.number}-${label ?? "player"}`} style={rowStyle}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 5,
          background: label ? "rgba(255,255,255,0.14)" : side === "home" ? "#1faa59" : "#0f766e",
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          fontSize: label ? 13 : 15,
          color: label ? palette.text : "#0a0c0f",
          border: label ? `1px solid ${palette.cardBorder}` : undefined,
        }}
      >
        {label ?? p.number}
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
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {p.goals > 0 && (
            <span
              style={{
                minWidth: 20,
                padding: "2px 2px",
                textAlign: "center",
                borderRadius: 5,
                background: palette.accentSoft,
                color: palette.accent,
                fontWeight: 800,
                fontSize: 16,
                marginRight: 8,
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
  );

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.28)",
        borderRadius: 12,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: "0 8px 18px rgba(0,0,0,0.24)",
        padding: "3px 5px",
        display: "grid",
        gridTemplateRows: "1fr",
        gap: 0,
        minHeight: 0,
        height: "100%",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 3,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {sorted.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "10px",
              opacity: 0.65,
              fontSize: 13,
              color: palette.muted,
              textAlign: "center",
            }}
          >
            Nessun giocatore caricato
          </div>
        )}

        {[left, right].map((column, colIdx) => (
          <div key={colIdx} style={{ display: "grid", gap: 2 }}>
            {column.map((p) => renderRow(p))}
            {coachName && sorted.length % 2 === 1 && colIdx === 1 && renderRow({ number: 0, name: coachName, ejections: 0, goals: 0 }, "ALL")}
          </div>
        ))}

        {coachName && sorted.length % 2 === 0 && sorted.length > 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "8px 10px",
              textAlign: "center",
              fontWeight: 800,
              color: palette.text,
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: `1px dashed ${palette.cardBorder}`,
            }}
          >
            Allenatore: {coachName}
          </div>
        )}
      </div>
    </div>
  );
}

function DisplayPage() {
  const { snapshot } = useMatchChannel(WS_URL);
  const [showGoalVideo, setShowGoalVideo] = useState(false);
  const [goalVideoKey, setGoalVideoKey] = useState(0);
  const [goalVideoEnabled] = useState(false);
  const [scale, setScale] = useState(1);
  const prevHomeScoreRef = useRef<number | null>(null);
  const goalTimerRef = useRef<number | null>(null);

  const clockLabel = snapshot ? formatClock(snapshot.clock.remainingMs) : "00:00";
  const activeExpulsions = snapshot
    ? {
        home: snapshot.expulsions.filter((e) => e.teamId === "home" && e.running).length,
        away: snapshot.expulsions.filter((e) => e.teamId === "away" && e.running).length,
      }
    : { home: 0, away: 0 };
  const isRunning = snapshot?.clock.running ?? false;
  const statusLabel = isRunning ? "In corso" : "Pausa";
  const statusColor = isRunning ? palette.accent : "#f6c744";

  // Goal video (invariato)
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
      if (goalTimerRef.current !== null) window.clearTimeout(goalTimerRef.current);
      goalTimerRef.current = window.setTimeout(() => setShowGoalVideo(false), 5000);
    }

    prevHomeScoreRef.current = score;
  }, [snapshot, goalVideoEnabled]);

  useEffect(() => {
    return () => {
      if (goalTimerRef.current !== null) window.clearTimeout(goalTimerRef.current);
    };
  }, []);

  // Scala dinamica per adattare lo stage 960x480 (UNA SOLA VOLTA)
  useEffect(() => {
    const baseWidth = 960;
    const baseHeight = 480;
    const computeScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next = Math.min(vw / baseWidth, vh / baseHeight);
      setScale(next);
    };
    computeScale();
    window.addEventListener("resize", computeScale);
    return () => window.removeEventListener("resize", computeScale);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: palette.bg,
        color: palette.text,
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
          <video key={goalVideoKey} src="/goal-home.mp4" autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      )}

      {/* STAGE 960x480 centrato e scalato UNA SOLA VOLTA */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 960,
          height: 480,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
          padding: "4px 6px",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateRows: "92px 1fr",
          gap: 4,
          minHeight: 0,
        }}
      >
        {/* Riga unica timer + punteggi */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.9fr 0.7fr 0.9fr",
            gap: 4,
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          <TeamTile
            side="home"
            name={snapshot?.teams.home.info.name}
            logo={snapshot?.teams.home.info.logoUrl}
            score={snapshot?.teams.home.score}
            timeoutsRemaining={snapshot?.teams.home.timeoutsRemaining}
          />

          <div
            style={{
              background: "linear-gradient(145deg, rgba(91,225,175,0.18), rgba(12,32,25,0.9))",
              borderRadius: 12,
              border: `1px solid ${palette.cardBorder}`,
              padding: "2px 6px",
              display: "grid",
              gridTemplateRows: "auto 1fr",
              alignItems: "center",
              justifyItems: "center",
              gap: 1,
              boxShadow: "0 5px 12px rgba(0,0,0,0.2)",
              height: "100%",
            }}
          >
            <div style={{ textAlign: "center", fontWeight: 700, color: palette.muted, fontSize: 15, marginTop: 4 }}>
              Periodo {snapshot?.period ?? "-"}
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: 62,
                fontWeight: 900,
                lineHeight: 0.9,
                whiteSpace: "nowrap",
                textShadow: "0 6px 16px rgba(0,0,0,0.4)",
                letterSpacing: -1,
              }}
            >
              {clockLabel}
            </div>
          </div>

          <TeamTile
            side="away"
            name={snapshot?.teams.away.info.name}
            logo={snapshot?.teams.away.info.logoUrl}
            score={snapshot?.teams.away.score}
            timeoutsRemaining={snapshot?.teams.away.timeoutsRemaining}
          />
        </div>

        {/* Roster */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            minHeight: 0,
            height: "100%",
          }}
        >
          <PlayerList players={snapshot?.teams.home.info.players ?? []} side="home" coachName={snapshot?.teams.home.info.coachName} />
          <PlayerList players={snapshot?.teams.away.info.players ?? []} side="away" coachName={snapshot?.teams.away.info.coachName} />
        </div>
      </div>
    </div>
  );
}

export default DisplayPage;
