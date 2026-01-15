# Tabellone Pallanuoto

Monorepo (server + client + shared + desktop) per gestire e mostrare un tabellone di pallanuoto. Il server e' l'unica fonte di verita' e comunica via WebSocket con le UI. Il pacchetto desktop (Electron) avvia il server e apre due finestre: setup/control + display.

## Prerequisiti
- Node.js >= 18
- npm (workspace)

## Struttura
- `shared/`: tipi comuni (snapshot, comandi, modelli dominio)
- `server/`: dominio/applicazione/infrastruttura in TypeScript, WebSocket server su porta 4000
- `client/`: React/TS con route `#/setup`, `#/control`, `#/display` (HashRouter per funzionare via `file://`)
- `desktop/`: main Electron, avvio server integrato, finestre setup/control + display fullscreen
- `release/`: output electron-builder (non versionare)

## Installazione
```bash
npm install
```

## Avvio in locale (dev)
1) Server (porta default 4000, sovrascrivibile con `PORT`):
```bash
npm run dev -w server
```
2) Client (Vite su 5173):
```bash
npm run dev -w client
```
3) Apri:
- `http://localhost:5173/#/setup`
- `http://localhost:5173/#/control`
- `http://localhost:5173/#/display`

## Build sorgenti
- Tutto: `npm run build`
- Solo server: `npm run build -w server`
- Solo client: `npm run build -w client`
- Solo shared: `npm run build -w shared`
- Lint server+client: `npm run lint`

## Packaging desktop (Windows)
Prerequisito: dipendenze installate (`npm install`).

1) Build + packaging:
```bash
npm run dist
```
2) Output:
- installer: `release/Promogest Setup 0.1.0.exe`
- app unpacked: `release/win-unpacked/Promogest.exe`

Note utili:
- Se la build fallisce con "Access is denied" su `release/win-unpacked`, chiudi l'app e cancella la cartella `release/win-unpacked`, poi rilancia `npm run dist`.
- Se `electron-builder` fallisce sui symlink, attiva Developer Mode in Windows o esegui PowerShell come amministratore.

## Packaging desktop (Linux)
1) Build + packaging:
```bash
npm run dist
```
2) Output:
- AppImage in `release/`
- cartella `linux-unpacked/` (se serve senza FUSE)

## Configurazione
- `PORT` (server): porta WebSocket (default `4000`).
- `VITE_WS_URL` (client): URL WebSocket del server. Se non impostato, in build usa `127.0.0.1:4000`.

Esempio per LAN (build client puntata al PC che ospita il server):
```bash
set VITE_WS_URL=ws://192.168.1.10:4000
npm run dist
```

## Display e schermi
- Il display Electron cerca un monitor 960x480 (LED wall) e va fullscreen su quello.
- Se non trova 960x480, usa il monitor secondario o il primario.
- Per il LED wall, usa "Estendi schermo" in Windows e imposta la risoluzione del secondo monitor a 960x480.

## Funzionalita'
- Punteggio: goal +1, undo goal -1.
- Timer gara: start/pausa/reset, set tempo rimanente manuale, periodo 1-4.
- Timeout squadra con conteggio locale 60s.
- Espulsioni: timer 18s, espulsioni personali (giallo-giallo-rosso).
- Roster: inserimento/edizione, due colonne numeri+nomi; coach opzionale mostrato sul display.
- Goal modal: scelta marcatore opzionale; gol per giocatore tracciati.
- Preset: salvataggio/caricamento (localStorage) da Setup; loghi via file salvati come data URL.
- Display: layout 960x480, timer, punteggi, roster, coach, loghi; video gol disattivato di default.
- Shortcut: Spacebar avvia/pausa timer (se non stai digitando in un input).

## Preset e dati locali
- Chiave `tabellone-presets` in `localStorage` (solo sul PC in uso).
- Per pulire: DevTools -> Application/Storage -> Local Storage, o `localStorage.removeItem("tabellone-presets")`.
- Loghi caricati da file sono salvati come data URL (non servono path assoluti).

## Note architetturali
- **Domain**: `server/src/domain/match.ts` (timer, periodi, goal, espulsioni, timeout, roster, coach).
- **Application**: `server/src/application/matchService.ts` gestisce i comandi e restituisce snapshot.
- **Infrastructure**: `server/src/infrastructure/websocketServer.ts` espone il WS server e broadcast degli snapshot.
- **Client**: React/TS; logica di gara lato server, il client invia comandi e renderizza snapshot push.

## Troubleshooting
- Schermo nero in build: verifica che il WS punti a un host valido (`ws://127.0.0.1:4000`) e che l'hash sia `#/display` o `#/setup`.
- WebSocket non si connette: verifica porta 4000 libera; in Electron il server e' integrato e parte in automatico.
- AppImage non parte: prova `--no-sandbox` o usa `linux-unpacked/` se manca FUSE.
