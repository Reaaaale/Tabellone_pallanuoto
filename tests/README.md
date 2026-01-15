# Test Suite - Tabellone WP

Test automatici per verificare il funzionamento del progetto Tabellone WP.

## Setup

Installa le dipendenze per i test:

```powershell
pip install -r tests/requirements.txt
```

## Eseguire i test

### Tutti i test
```powershell
pytest
```

### Test specifici
```powershell
# Solo test del server
pytest tests/test_server.py

# Solo test del client
pytest tests/test_client.py

# Test specifico
pytest tests/test_server.py::TestWebSocketServer::test_connection
```

### Con output dettagliato
```powershell
pytest -v
```

### Con stampa di output
```powershell
pytest -s
```

## Prerequisiti

Prima di eseguire i test, assicurati che:
1. Il server sia avviato: `npm run dev -w server`
2. Il client sia avviato: `npm run dev -w client`

## Struttura test

- `conftest.py` - Configurazione pytest e fixture condivise
- `test_server.py` - Test per il server WebSocket
- `test_client.py` - Test per il client web
- `requirements.txt` - Dipendenze Python per i test

## Test disponibili

### Server WebSocket
- Test connessione base
- Test impostazione info squadra
- Test controllo timer (start/pause)
- Test segnatura goal
- Health check server

### Client Web
- Test accessibilità pagina control
- Test accessibilità pagina display
- Test accessibilità pagina setup
