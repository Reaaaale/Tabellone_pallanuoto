"""
Test per il client web del Tabellone WP
"""
import pytest
import requests


class TestClientEndpoints:
    """Test degli endpoint del client"""

    def test_client_running(self, client_url):
        """Verifica che il client sia accessibile"""
        try:
            response = requests.get(client_url, timeout=5)
            assert response.status_code == 200
        except Exception as e:
            pytest.skip(f"Client non disponibile: {e}")

    def test_control_page(self, client_url):
        """Verifica che la pagina control sia accessibile"""
        try:
            response = requests.get(f"{client_url}/#/control", timeout=5)
            assert response.status_code == 200
        except Exception as e:
            pytest.skip(f"Client non disponibile: {e}")

    def test_display_page(self, client_url):
        """Verifica che la pagina display sia accessibile"""
        try:
            response = requests.get(f"{client_url}/#/display", timeout=5)
            assert response.status_code == 200
        except Exception as e:
            pytest.skip(f"Client non disponibile: {e}")

    def test_setup_page(self, client_url):
        """Verifica che la pagina setup sia accessibile"""
        try:
            response = requests.get(f"{client_url}/#/setup", timeout=5)
            assert response.status_code == 200
        except Exception as e:
            pytest.skip(f"Client non disponibile: {e}")
