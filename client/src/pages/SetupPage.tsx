import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TeamSide } from "@tabellone/shared";
import { useMatchChannel } from "../hooks/useMatchChannel";
import { getPresets, parseRosterText, RosterPreset, savePresets } from "../utils/presets";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000";

interface TeamFormState {
  name: string;
  logoUrl: string;
  coachName: string;
  rosterText: string;
}

function SetupPage() {
  const { send, status } = useMatchChannel(WS_URL);
  const navigate = useNavigate();

  const [home, setHome] = useState<TeamFormState>({ name: "Casa", logoUrl: "", coachName: "", rosterText: "" });
  const [away, setAway] = useState<TeamFormState>({ name: "Ospiti", logoUrl: "", coachName: "", rosterText: "" });
  const defaultQuick = () => Array.from({ length: 15 }, (_, i) => ({ number: i + 1, name: "" }));
  const [quickRoster, setQuickRoster] = useState<Record<TeamSide, { number: number; name: string }[]>>({
    home: defaultQuick(),
    away: defaultQuick(),
  });
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<RosterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");

  useEffect(() => {
    setPresets(getPresets());
  }, []);

  const applyPreset = (preset: RosterPreset) => {
    setHome({ ...preset.home, coachName: preset.home.coachName ?? "" });
    setAway({ ...preset.away, coachName: preset.away.coachName ?? "" });
    const parsedHome = parseRosterText(preset.home.rosterText || "");
    const parsedAway = parseRosterText(preset.away.rosterText || "");
    setQuickRoster({
      home: defaultQuick().map((slot) => {
        const found = parsedHome.find((p) => p.number === slot.number);
        return found ? { number: found.number, name: found.name } : slot;
      }),
      away: defaultQuick().map((slot) => {
        const found = parsedAway.find((p) => p.number === slot.number);
        return found ? { number: found.number, name: found.name } : slot;
      }),
    });
    setHome((prev) => ({ ...prev, logoFile: null }));
    setAway((prev) => ({ ...prev, logoFile: null }));
  };

  const handleLoadPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      setSelectedPresetId(id);
      applyPreset(preset);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const makeRosterText = (teamId: TeamSide) =>
      quickRoster[teamId]
        .filter((p) => p.name.trim())
        .map((p) => `${p.number} ${p.name.trim()}`)
        .join("\n");

    const newPreset: RosterPreset = {
      id: presetName.trim(),
      label: presetName.trim(),
      home: { ...home, rosterText: makeRosterText("home") },
      away: { ...away, rosterText: makeRosterText("away") },
    };
    const updated = [...presets.filter((p) => p.id !== newPreset.id), newPreset];
    setPresets(updated);
    savePresets(updated);
    setSelectedPresetId(newPreset.id);
  };

  const sendTeams = async () => {
    const buildPlayers = (teamId: TeamSide) => {
      const fromQuick = quickRoster[teamId]
        .filter((p) => p.name.trim())
        .map((p) => ({
          number: p.number,
          name: p.name.trim(),
          goals: 0,
          ejections: 0,
        }));

      if (fromQuick.length > 0) return fromQuick;

      const preset = presets.find((p) => p.id === selectedPresetId);
      if (preset) {
        const text = teamId === "home" ? preset.home.rosterText : preset.away.rosterText;
        return parseRosterText(text);
      }
      return [];
    };

    const homePlayers = buildPlayers("home");
    const awayPlayers = buildPlayers("away");

    const [homeLogo, awayLogo] = [home.logoUrl, away.logoUrl];

    send({
      type: "set_team_info",
      payload: { teamId: "home", name: home.name, logoUrl: homeLogo, coachName: home.coachName },
    });
    send({
      type: "set_team_info",
      payload: { teamId: "away", name: away.name, logoUrl: awayLogo, coachName: away.coachName },
    });
    send({ type: "set_roster", payload: { teamId: "home", players: homePlayers } });
    send({ type: "set_roster", payload: { teamId: "away", players: awayPlayers } });
  };

  const startMatch = async () => {
    await sendTeams();
    // Piccola attesa per evitare di chiudere la connessione prima dell'invio
    setTimeout(() => navigate("/control"), 150);
  };

  const renderTeamForm = (teamId: TeamSide) => {
    const state = teamId === "home" ? home : away;
    const setState = teamId === "home" ? setHome : setAway;
    const label = teamId === "home" ? "Casa" : "Ospiti";

    return (
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{label}</div>
        <input
          placeholder="Nome squadra"
          value={state.name}
          onChange={(e) => setState({ ...state, name: e.target.value })}
        />
        <input
          placeholder="Allenatore"
          value={state.coachName}
          onChange={(e) => setState({ ...state, coachName: e.target.value })}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="URL logo (es. /logo.png)"
            value={state.logoUrl}
            onChange={(e) => setState({ ...state, logoUrl: e.target.value, logoFile: null })}
            style={{ flex: 1 }}
          />
          <label
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Sfoglia
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = reader.result as string;
                    setState({ ...state, logoUrl: dataUrl });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {quickRoster[teamId].map((row, idx) => (
            <div
              key={row.number}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: teamId === "home" ? "linear-gradient(135deg,#2ecc71,#16a085)" : "linear-gradient(135deg,#1e90ff,#0fa3b1)",
                  color: "#0b0d10",
                  fontWeight: 900,
                  textAlign: "center",
                  fontSize: 16,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                #{row.number}
              </div>
              <input
                placeholder="Nome"
                value={row.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuickRoster((prev) => {
                    const next = { ...prev };
                    next[teamId] = prev[teamId].map((item, i) =>
                      i === idx ? { ...item, name: value } : item
                    );
                    return next;
                  });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 20% 20%, rgba(37,47,66,0.35), rgba(9,13,19,0.9))",
        color: "#f5f7fa",
        padding: "24px 28px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: 14,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Connessione</div>
            <div style={{ fontWeight: 800, color: status === "open" ? "#5be1af" : "#f66" }}>
              {status === "open" ? "Online" : "Offline"}
            </div>
          </div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Setup gara</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={selectedPresetId}
            onChange={(e) => handleLoadPreset(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">Carica preset</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Nome preset"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            style={{ width: 160 }}
          />
          <button className="btn ghost" onClick={handleSavePreset}>
            Salva preset
          </button>
        </div>
      </header>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {renderTeamForm("home")}
          {renderTeamForm("away")}
        </div>

        <div style={{ display: "grid", placeItems: "center", marginTop: 10 }}>
          <button className="btn primary" onClick={startMatch}>
            Avvia gara
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetupPage;
