import { useNavigate } from "react-router-dom";
import { useMatchChannel } from "../hooks/useMatchChannel";

const WS_HOST = window.location.hostname || "127.0.0.1";
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${WS_HOST}:4000`;

function StartPage() {
  const navigate = useNavigate();
  const { status } = useMatchChannel(WS_URL);
  const baseUrl = import.meta.env.BASE_URL || "/";

  return (
    <div className="start-shell basic-start">
      <style>
        {`
          .start-shell {
            min-height: 100vh;
            color: #f5f7fa;
            background:
              radial-gradient(circle at 20% 20%, rgba(27, 160, 98, 0.22), transparent 55%),
              radial-gradient(circle at 80% 10%, rgba(16, 110, 70, 0.2), transparent 45%),
              linear-gradient(135deg, #07140f 0%, #0b1b14 50%, #06110c 100%);
            padding: 30px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          .basic-start {
            display: grid;
            place-items: center;
          }
          .basic-wrap {
            width: min(720px, 92vw);
            text-align: center;
            display: grid;
            gap: 14px;
            align-items: center;
          }
          .basic-logos {
            display: grid;
            gap: 28px;
            justify-items: center;
          }
          .basic-logo {
            width: 140px;
            height: 140px;
            border-radius: 28px;
            background: transparent;
            display: grid;
            place-items: center;
            margin: 0 auto;
            box-shadow: none;
          }
          .basic-subtitle {
            font-size: 14px;
            opacity: 0.7;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            font-weight: 700;
          }
          .basic-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.06);
            font-size: 11px;
            font-weight: 800;
            justify-self: center;
          }
          @media (max-width: 900px) {
            .start-shell { padding: 20px; }
            .basic-logo { width: 110px; height: 110px; }
            .basic-subtitle { font-size: 12px; }
          }
        `}
      </style>
      <div className="basic-wrap">
        <div className="basic-logos">
          <div className="basic-logo">
            <img
              src={`${baseUrl}scudetto_promogest.png`}
              alt="Promogest"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
          <div className="basic-logo" style={{ width: 420, height: 120 }}>
            <img
              src={`${baseUrl}png_promogest_logo.png`}
              alt="Promogest"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
        <div className="basic-subtitle">CentroNuoto Paolo Pettinau</div>
        <div
          className="basic-status"
          style={{
            color: status === "open" ? "#5be1af" : "#ff8a5c",
            borderColor: status === "open" ? "rgba(91,225,175,0.35)" : "rgba(255,138,92,0.35)",
          }}
        >
          {status === "open" ? "Online" : "Offline"}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button className="btn primary" onClick={() => navigate("/setup")} style={{ padding: "16px 28px", fontSize: 18 }}>
            Nuova Partita
          </button>
        </div>
      </div>
    </div>
  );
}

export default StartPage;
