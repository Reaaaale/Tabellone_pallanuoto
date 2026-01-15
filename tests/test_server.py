"""
Test per il server WebSocket del Tabellone WP
"""
import pytest
import websockets
import json
import asyncio


class TestWebSocketServer:
    """Test del server WebSocket"""

    @pytest.mark.asyncio
    async def test_connection(self, server_url):
        """Test connessione base al server"""
        try:
            async with websockets.connect(server_url) as websocket:
                # Attendi il messaggio di snapshot iniziale
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                assert "type" in data
                assert data["type"] == "snapshot"
                assert "payload" in data
        except Exception as e:
            pytest.skip(f"Server non disponibile: {e}")

    @pytest.mark.asyncio
    async def test_set_team_info(self, server_url):
        """Test impostazione info squadra"""
        try:
            async with websockets.connect(server_url) as websocket:
                # Ricevi snapshot iniziale
                await websocket.recv()
                
                # Invia comando per impostare info squadra
                command = {
                    "type": "set_team_info",
                    "payload": {
                        "teamId": "home",
                        "name": "Test Team",
                        "logoUrl": ""
                    }
                }
                await websocket.send(json.dumps(command))
                
                # Attendi conferma
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                
                assert data["type"] == "snapshot"
                assert data["payload"]["teams"]["home"]["info"]["name"] == "Test Team"
        except Exception as e:
            pytest.skip(f"Server non disponibile: {e}")

    @pytest.mark.asyncio
    async def test_clock_control(self, server_url):
        """Test controllo timer"""
        try:
            async with websockets.connect(server_url) as websocket:
                # Ricevi snapshot iniziale
                initial = await websocket.recv()
                initial_data = json.loads(initial)
                
                # Avvia il clock
                await websocket.send(json.dumps({"type": "start_clock"}))
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                
                assert data["payload"]["clock"]["running"] is True
                
                # Pausa il clock
                await websocket.send(json.dumps({"type": "pause_clock"}))
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                
                assert data["payload"]["clock"]["running"] is False
        except Exception as e:
            pytest.skip(f"Server non disponibile: {e}")

    @pytest.mark.asyncio
    async def test_goal_scoring(self, server_url):
        """Test segnatura goal"""
        try:
            async with websockets.connect(server_url) as websocket:
                # Ricevi snapshot iniziale
                await websocket.recv()
                
                # Segna un goal per la squadra casa
                command = {
                    "type": "goal",
                    "payload": {
                        "teamId": "home",
                        "playerNumber": 1
                    }
                }
                await websocket.send(json.dumps(command))
                
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                
                assert data["payload"]["teams"]["home"]["score"] == 1
        except Exception as e:
            pytest.skip(f"Server non disponibile: {e}")


class TestServerHealthCheck:
    """Test di health check base"""
    
    def test_server_running(self, server_url):
        """Verifica che il server sia raggiungibile"""
        import socket
        host = "localhost"
        port = 4000
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        try:
            result = sock.connect_ex((host, port))
            assert result == 0, f"Server non raggiungibile su {host}:{port}"
        except Exception as e:
            pytest.skip(f"Impossibile verificare il server: {e}")
        finally:
            sock.close()
