import { useEffect, useRef, useState, type CSSProperties } from "react";
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
              width: 27,
              height: 9,
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
                  fontSize: 75,
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
                  fontSize: 75,
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
  const rowStyle: CSSProperties = {
    display: "flex",
    flexDirection: side === "home" ? "row" : "row-reverse",
    alignItems: "center",
    padding: "0 6px",
    gap: 8,
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
          width: 45,
          height: 45,
          borderRadius: 5,
          background: label
            ? "rgba(255,255,255,0.14)"
            : p.number === 1 || p.number === 13
              ? "#e11d48"
              : side === "home"
                ? "#1faa59"
                : "#0f766e",
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          fontSize: label ? 12 : 34,
          color: "#ffffff",
          border: label ? `1px solid ${palette.cardBorder}` : undefined,
        }}
      >
        {label ?? p.number}
      </div>

      <div
        style={{
          fontSize: 35,
          fontWeight: 700,
          textTransform: "uppercase",
          display: "flex",
          flexDirection: side === "home" ? "row" : "row-reverse",
          alignItems: "center",
          justifyContent: side === "home" ? "space-between" : "flex-start",
          gap: 6,
          color: palette.text,
          flex: 1,
          minWidth: 0,
          lineHeight: 1,
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1,
            textAlign: side === "home" ? "left" : "right",
          }}
        >
          {p.name}
        </span>
        <span
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexShrink: 0,
            marginRight: side === "home" ? 0 : "auto",
          }}
        >
          {p.goals > 0 && (
            <span
              style={{
                minWidth: 56,
                height: 32,
                padding: 0,
                borderRadius: 5,
                background: palette.accentSoft,
                color: palette.accent,
                fontWeight: 800,
                fontSize: 20,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                lineHeight: 1,
              }}
              title={`${p.goals} gol`}
            >
              <span style={{ color: "#ffffff" }}>⚽︎</span>
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
                    width: 20,
                    height: 20,
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
  const baseUrl = import.meta.env.BASE_URL || "/";
  const { snapshot, introVideoKey } = useMatchChannel(WS_URL);
  const [showGoalVideo, setShowGoalVideo] = useState(false);
  const [goalVideoKey, setGoalVideoKey] = useState(0);
  const [goalVideoEnabled] = useState(false);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [introKey, setIntroKey] = useState(0);
  const sirenRef = useRef<HTMLAudioElement | null>(null);
  const prevRemainingRef = useRef<number | null>(null);
  const sirenTimeoutRef = useRef<number | null>(null);
  const sirenPlayedRef = useRef<{ period: number; played: boolean }>({ period: 1, played: false });
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

  useEffect(() => {
    if (!snapshot) return;
    const prevRemaining = prevRemainingRef.current;
    const nowRemaining = snapshot.clock.remainingMs;
    prevRemainingRef.current = nowRemaining;

    if (sirenPlayedRef.current.period !== snapshot.period) {
      sirenPlayedRef.current = { period: snapshot.period, played: false };
    }
    if (prevRemaining === 0 && nowRemaining > 0) {
      sirenPlayedRef.current.played = false;
    }

    if (!snapshot.clock.running || sirenPlayedRef.current.played) return;

    if (nowRemaining <= 1200 && sirenRef.current) {
      sirenPlayedRef.current.played = true;
      sirenRef.current.currentTime = 0;
      sirenRef.current.play().catch(() => undefined);
    }
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    if (sirenTimeoutRef.current !== null) {
      window.clearTimeout(sirenTimeoutRef.current);
      sirenTimeoutRef.current = null;
    }
    if (!snapshot.clock.running || snapshot.clock.remainingMs <= 0 || sirenPlayedRef.current.played) return;
    const leadMs = 1200;
    const delay = Math.max(0, snapshot.clock.remainingMs - leadMs);
    sirenTimeoutRef.current = window.setTimeout(() => {
      if (!sirenRef.current || sirenPlayedRef.current.played) return;
      sirenPlayedRef.current.played = true;
      sirenRef.current.currentTime = 0;
      sirenRef.current.play().catch(() => undefined);
    }, delay);
  }, [snapshot?.clock.running, snapshot?.clock.remainingMs, snapshot?.period]);

  useEffect(() => {
    if (!introVideoKey) return;
    setIntroKey(introVideoKey);
    setShowIntroVideo(true);
  }, [introVideoKey]);

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
          <video
            key={goalVideoKey}
            src={`${baseUrl}goal-home.mp4`}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      {showIntroVideo && (
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
            key={introKey}
            src={`${baseUrl}intro.mp4`}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onEnded={() => setShowIntroVideo(false)}
          />
        </div>
      )}

      <audio ref={sirenRef} src={`${baseUrl}sirena.mpeg`} preload="auto" />

      {/* Layout full-screen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          padding: 4,
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "1fr 0.8fr 1fr",
          gap: 4,
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", marginTop: 2, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
              <div style={{ width: 200, height: 200, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 12 }}>
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
              <div style={{ width: 200, height: 200, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 12 }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
            <div style={{ textAlign: "center", fontSize:100, fontWeight: 900, color: palette.accent }}>
              {snapshot?.teams.home.score ?? 0}
            </div>
            <div style={{ textAlign: "center", fontSize: 100 , fontWeight: 900, color: palette.accent }}>
              {snapshot?.teams.away.score ?? 0}
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
            fontSize: 130,
            fontWeight: 900,
            lineHeight: 0.9,
            whiteSpace: "nowrap",
            textShadow: "0 6px 16px rgba(0,0,0,0.4)",
            letterSpacing: -1,
          }}
        >
          {clockLabel}
        </div>

          <div style={{ textAlign: "center", fontWeight: 800, color: palette.muted, fontSize: 50 }}>
            Periodo {snapshot?.period ?? "-"}
          </div>
        </div>

        <PlayerList players={snapshot?.teams.away.info.players ?? []} side="away" />
      </div>
    </div>
  );
}

export default DisplayPage;
