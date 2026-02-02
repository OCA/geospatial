# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from unittest.mock import MagicMock, patch

from odoo.tests.common import TransactionCase


class TestGeocodingMixin(TransactionCase):
    """Tests for the Leaflet Geocoding Mixin."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.GeocodingMixin = cls.env["leaflet.geocoding.mixin"]

    def test_validate_coordinates_valid(self):
        """Test coordinate validation with valid coordinates."""
        self.assertTrue(self.GeocodingMixin.validate_coordinates(45.0, 90.0))
        self.assertTrue(self.GeocodingMixin.validate_coordinates(-45.0, -90.0))
        self.assertTrue(self.GeocodingMixin.validate_coordinates(0, 0))
        self.assertTrue(self.GeocodingMixin.validate_coordinates(90, 180))
        self.assertTrue(self.GeocodingMixin.validate_coordinates(-90, -180))

    def test_validate_coordinates_invalid(self):
        """Test coordinate validation with invalid coordinates."""
        self.assertFalse(self.GeocodingMixin.validate_coordinates(91, 0))
        self.assertFalse(self.GeocodingMixin.validate_coordinates(-91, 0))
        self.assertFalse(self.GeocodingMixin.validate_coordinates(0, 181))
        self.assertFalse(self.GeocodingMixin.validate_coordinates(0, -181))
        self.assertFalse(self.GeocodingMixin.validate_coordinates(None, None))
        self.assertFalse(self.GeocodingMixin.validate_coordinates("invalid", 0))

    def test_get_geocoding_provider_default(self):
        """Test default geocoding provider is nominatim."""
        provider = self.GeocodingMixin._get_geocoding_provider()
        self.assertEqual(provider, "nominatim")

    def test_get_nominatim_url_default(self):
        """Test default Nominatim URL."""
        url = self.GeocodingMixin._get_nominatim_url()
        self.assertEqual(url, "https://nominatim.openstreetmap.org")

    @patch("odoo.addons.web_leaflet_lib.models.geocoding_mixin.requests.get")
    def test_geocode_nominatim_success(self, mock_get):
        """Test successful Nominatim geocoding."""
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {
                "lat": "-22.9068",
                "lon": "-43.1729",
                "display_name": "Rio de Janeiro, Brazil",
            }
        ]
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        result = self.GeocodingMixin._geocode_nominatim("Rio de Janeiro, Brazil", "BR")

        self.assertIsNotNone(result)
        self.assertAlmostEqual(result["lat"], -22.9068, places=4)
        self.assertAlmostEqual(result["lng"], -43.1729, places=4)
        self.assertEqual(result["provider"], "nominatim")

    @patch("odoo.addons.web_leaflet_lib.models.geocoding_mixin.requests.get")
    def test_geocode_nominatim_not_found(self, mock_get):
        """Test Nominatim geocoding when address not found."""
        mock_response = MagicMock()
        mock_response.json.return_value = []
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        result = self.GeocodingMixin._geocode_nominatim("NonexistentPlace12345", None)

        self.assertIsNone(result)

    @patch("odoo.addons.web_leaflet_lib.models.geocoding_mixin.requests.get")
    def test_reverse_geocode_nominatim_success(self, mock_get):
        """Test successful Nominatim reverse geocoding."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "address": {
                "city": "Rio de Janeiro",
                "country": "Brazil",
            },
            "display_name": "Rio de Janeiro, Brazil",
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        result = self.GeocodingMixin._reverse_geocode_nominatim(-22.9068, -43.1729)

        self.assertIsNotNone(result)
        self.assertEqual(result["display_name"], "Rio de Janeiro, Brazil")
        self.assertEqual(result["provider"], "nominatim")

    def test_batch_geocode_empty_list(self):
        """Test batch geocoding with empty list."""
        result = self.GeocodingMixin.batch_geocode([])
        self.assertEqual(result, [])
