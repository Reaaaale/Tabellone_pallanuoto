@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo Avvio Tabellone Pallanuoto...

REM 1) Vai nella cartella del progetto
cd /d C:\Linux_Windows_condivisi\tabellone_wp

REM 2) Avvia backend e frontend
start "Tabellone Server" cmd /c npm run dev -w server
timeout /t 2 /nobreak > nul
start "Tabellone Client" cmd /c npm run dev -w client

REM 3) Trova l'IPv4 della scheda Wi-Fi (192.168.x.x)
set "LAN_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"Indirizzo IPv4"') do (
  set "ip=%%A"
  set "ip=!ip: =!"
  echo !ip! | findstr /r "^192\.168\." >nul
  if not errorlevel 1 (
    set "LAN_IP=!ip!"
    goto :gotip
  )
)

:gotip
if "%LAN_IP%"=="" (
  echo ERRORE: non trovo un IP 192.168.x.x. Controlla la rete Wi-Fi.
  goto :eof
)

echo IP LAN trovato: %LAN_IP%

REM 4) Attendi che Vite sia su
timeout /t 3 /nobreak > nul

REM 5) Apri il browser sulla LAN (non localhost)
start "" "http://%LAN_IP%:5173/#/setup"

endlocal
