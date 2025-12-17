# Tabellone Pallanuoto (locale)

Progetto monorepo (server + client + shared) per la gestione e visualizzazione di un tabellone pallanuoto. Il backend è l'unica fonte di verità e comunica via WebSocket con le UI.

## Prerequisiti

- Node.js >= 18
- npm (workspace mode abilitato di default)

## Struttura

- `shared/`: tipi comuni (snapshot, comandi, modelli dominio)
- `server/`: domain/application/infrastructure in TypeScript, WebSocket server su porta 4000
- `client/`: frontend React con due route separate (`/control`, `/display`)

## Installazione

```bash
npm install
```

## Avvio in locale

1. Backend (porta di default 4000, sovrascrivibile via `PORT`):
   ```bash
   npm run dev -w server
   ```
2. Frontend (Vite su 5173):
   ```bash
   npm run dev -w client
   ```
3. Apri:
   - `http://localhost:5173/control` per l'operatore
   - `http://localhost:5173/display` per il LED wall (fullscreen)

## Funzionalita principali

- Gestione punteggio con aggiunta e decremento goal (per correzioni rapide).
- Timer di gara con avvio/pausa/reset e impostazione manuale del tempo rimanente.
- Selezione periodo (1-4) e gestione timeout squadra.
- Gestione espulsioni attive (20s) con selezione giocatore.
- Roster squadre: inserimento tramite textarea, poi visualizzazione lista giocatori.
- Espulsioni personali per giocatore (0-3) con indicatori: giallo per 1-2, rosso alla terza.
- Display ottimizzato per LED wall con punteggi, timer, roster ed espulsioni attive.

## Controlli rapidi

- Spazio: avvia/pausa il timer (se non stai scrivendo in un input).

## Build e lint

- Build di tutti i pacchetti: `npm run build`
- Solo server: `npm run build -w server`
- Solo client: `npm run build -w client`
- Solo shared: `npm run build -w shared`
- Lint (server + client): `npm run lint`

## Configurazione

- `VITE_WS_URL` (client): URL WebSocket del server. Default `ws://localhost:4000`.
- `PORT` (server): porta del WebSocket server. Default `4000`.

## Note architetturali

- **Domain layer**: `server/src/domain/match.ts` contiene la logica di gara (timer, periodi, goal, espulsioni, timeout, roster). Timer e espulsioni sono calcolati con timestamp di avvio e remaining.
- **Application layer**: `server/src/application/matchService.ts` orchestra i comandi e restituisce snapshot.
- **Infrastructure**: `server/src/infrastructure/websocketServer.ts` espone il WebSocket server, broadcast periodico di snapshot.
- **Presentation**: React/TS, nessuna logica di gara critica lato client; invia solo comandi e mostra lo stato push dal server.

## Persistenza

Non è ancora presente storage su file/SQLite. Lo snapshot vive in memoria; è predisposto per essere salvato in futuro aggiungendo un adapter di persistenza (fuori scope di questa fase).
