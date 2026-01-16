import { useEffect, useRef, useState } from "react";
import { TeamSide } from "@tabellone/shared";
import { useMatchChannel } from "../hooks/useMatchChannel";
import { formatClock } from "../utils/time";

const WS_HOST = window.location.hostname || "127.0.0.1";
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${WS_HOST}:4000`;


// Palette centrale per sfondo, card, testi e accenti.
const palette = {
  bg: "radial-gradient(circle at 20% 20%, rgba(22,122,74,0.2), transparent 60%), #000000",
  card: "rgba(8, 8, 8, 0.9)",
  cardBorder: "rgba(27, 64, 50, 0.8)",
  accent: "#18c77b",
  accentSoft: "rgba(24, 199, 123, 0.2)",
  text: "#f8fafc",
  muted: "rgba(248,250,252,0.7)",
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
              width: 18,
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
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.6))",
        borderRadius: 10,
        border: `2px solid ${palette.cardBorder}`,
        padding: "6px 8px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 22,
        boxShadow: "0 10px 22px rgba(0,0,0,0.4)",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {alignRight ? (
        <>
          <div
            style={{
              fontSize: 58,
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

            <div style={{ textAlign: "right", minWidth: 0, maxWidth: 210 }}>
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
                  lineHeight: 1.05,
                }}
              >
                {name ?? sideLabel}
              </div>
            <TimeoutDots remaining={timeoutsRemaining ?? 0} alignRight />
          </div>

          {logo ? (
            <img src={logo} alt={`${name} logo`} style={{ maxHeight: 90, maxWidth: 130, objectFit: "contain", display: "block" }} />
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

            <div style={{ textAlign: "left", minWidth: 0, maxWidth: 210 }}>
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
                lineHeight: 1.05,
              }}
            >
              {name ?? sideLabel}
            </div>
            <TimeoutDots remaining={timeoutsRemaining ?? 0} />
          </div>

          <div
            style={{
              fontSize: 58,
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

function PlayerList({ players, side }: { players: PlayerRow[]; side: TeamSide }) {
  const sorted = [...players].slice(0, 14).sort((a, b) => a.number - b.number);
  const displayRows: { player: PlayerRow; label?: string }[] = sorted.map((p) => ({ player: p }));
  const rowsCount = Math.max(1, displayRows.length);
  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "30px 1fr",
    alignItems: "center",
    padding: "1px 6px",
    columnGap: 8,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.08)",
    overflow: "hidden",
  };

  const renderRow = (p: PlayerRow, label?: string, index?: number) => (
    <div
      key={`${p.number}-${label ?? "player"}`}
      style={{
        ...rowStyle,
        background: index !== undefined && index % 2 === 1 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
        borderColor: index !== undefined && index % 2 === 1 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: label ? "rgba(255,255,255,0.14)" : side === "home" ? "#1faa59" : "#0f766e",
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          fontSize: label ? 11 : 13,
          color: "#ffffff",
          border: label ? `1px solid ${palette.cardBorder}` : undefined,
        }}
      >
        {label ?? p.number}
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          color: palette.text,
          minWidth: 0,
          lineHeight: 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>
          {p.name}
        </span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {p.goals > 0 && (
            <span
              style={{
                minWidth: 18,
                padding: "1px 4px",
                textAlign: "center",
                borderRadius: 5,
                background: palette.accentSoft,
                color: palette.accent,
                fontWeight: 800,
                fontSize: 13,
                marginRight: 8,
              }}
              title={`${p.goals} gol`}
            >
              {p.goals}
            </span>
          )}

          {label !== "ALL" &&
            [0, 1, 2].map((idx) => {
              const active = p.ejections >= idx + 1;
              const color =
                idx === 2 ? (active ? "#e63946" : "rgba(255,255,255,0.18)") : active ? "#f6c744" : "rgba(255,255,255,0.18)";
              return (
                <span
                  key={idx}
                  style={{
                    width: 6,
                    height: 6,
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
        background: "rgba(0,0,0,0.6)",
        borderRadius: 10,
        border: `2px solid ${palette.cardBorder}`,
        boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
        padding: "4px 6px",
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
          gridTemplateColumns: "1fr",
          gridTemplateRows: `repeat(${rowsCount}, minmax(0, 1fr))`,
          rowGap: 2,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {sorted.length === 0 && (
          <div
            style={{
              padding: "10px",
              opacity: 0.65,
              fontSize: 16,
              color: palette.muted,
              textAlign: "center",
            }}
          >
            Nessun giocatore caricato
          </div>
        )}

        {displayRows.map((row, idx) => renderRow(row.player, row.label, idx))}
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
          padding: "8px 10px",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "1fr 0.4fr 1fr",
          gap: 6,
          minHeight: 0,
        }}
      >
        <PlayerList players={snapshot?.teams.home.info.players ?? []} side="home" />

        <div
          style={{
            background: "linear-gradient(145deg, rgba(24,199,123,0.18), rgba(0,0,0,0.9))",
            borderRadius: 10,
            border: `2px solid ${palette.cardBorder}`,
            padding: "3px",
            display: "grid",
            gridTemplateRows: "auto auto auto auto",
            alignItems: "center",
            justifyItems: "center",
            gap: 2,
            alignContent: "center",
            boxShadow: "0 8px 18px rgba(0,0,0,0.3)",
            minHeight: 0,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, width: "100%", marginTop: 2, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 2, justifyItems: "center" }}>
              <div style={{ width: 96, height: 96, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 10 }}>
                {snapshot?.teams.home.info.logoUrl ? (
                  <img
                    src={snapshot.teams.home.info.logoUrl}
                    alt={`${snapshot.teams.home.info.name} logo`}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%" }} />
                )}
              </div>
              <TimeoutDots remaining={snapshot?.teams.home.timeoutsRemaining ?? 0} />
            </div>
            <div style={{ display: "grid", gap: 2, justifyItems: "center" }}>
              <div style={{ width: 96, height: 96, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 10 }}>
                {snapshot?.teams.away.info.logoUrl ? (
                  <img
                    src={snapshot.teams.away.info.logoUrl}
                    alt={`${snapshot?.teams.away.info.name} logo`}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%" }} />
                )}
              </div>
              <TimeoutDots remaining={snapshot?.teams.away.timeoutsRemaining ?? 0} alignRight />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "100%" }}>
            <div style={{ textAlign: "center", fontSize: 34, fontWeight: 900, color: palette.accent }}>
              {snapshot?.teams.home.score ?? 0}
            </div>
            <div style={{ textAlign: "center", fontSize: 34, fontWeight: 900, color: palette.accent }}>
              {snapshot?.teams.away.score ?? 0}
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
            fontSize: 46,
            fontWeight: 900,
            lineHeight: 0.9,
            whiteSpace: "nowrap",
            textShadow: "0 6px 16px rgba(0,0,0,0.4)",
            letterSpacing: -1,
          }}
        >
          {clockLabel}
        </div>

          <div style={{ textAlign: "center", fontWeight: 800, color: palette.muted, fontSize: 14 }}>
            Periodo {snapshot?.period ?? "-"}
          </div>
        </div>

        <PlayerList players={snapshot?.teams.away.info.players ?? []} side="away" />
      </div>
    </div>
  );
}

export default DisplayPage;
