"""
Configurazione pytest per test del progetto Tabellone WP
"""
import pytest
import asyncio


@pytest.fixture(scope="session")
def event_loop():
    """Crea un event loop per i test asincroni"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def server_url():
    """URL del server WebSocket per i test"""
    return "ws://localhost:4000"


@pytest.fixture
def client_url():
    """URL del client per i test"""
    return "http://localhost:5173"
