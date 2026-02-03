# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

import logging
import time
from functools import wraps

import requests

from odoo import api, models

from .routing_service import RoutingServiceFactory

_logger = logging.getLogger(__name__)

# Throttling for Nominatim API (OSM requirement: max 1 request per second)
NOMINATIM_THROTTLE_MS = 1000
_last_nominatim_request = 0


def throttle_nominatim(func):
    """Decorator to enforce Nominatim rate limiting (1 req/sec)."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        global _last_nominatim_request
        now = time.time() * 1000  # Convert to milliseconds
        elapsed = now - _last_nominatim_request
        if elapsed < NOMINATIM_THROTTLE_MS:
            sleep_time = (NOMINATIM_THROTTLE_MS - elapsed) / 1000
            _logger.debug("Throttling Nominatim request, sleeping %.2fs", sleep_time)
            time.sleep(sleep_time)
        _last_nominatim_request = time.time() * 1000
        return func(*args, **kwargs)

    return wrapper


class GeocodingMixin(models.AbstractModel):
    """Mixin providing geocoding capabilities using Nominatim (OSM) or MapBox."""

    _name = "leaflet.geocoding.mixin"
    _description = "Leaflet Geocoding Mixin"

    @api.model
    def _get_geocoding_provider(self):
        """Get the configured geocoding provider."""
        config = self.env["ir.config_parameter"].sudo()
        provider = config.get_param("leaflet.geocoding_provider", "nominatim")
        return provider

    @api.model
    def _get_mapbox_token(self):
        """Get MapBox API token if configured."""
        return RoutingServiceFactory(self.env).get_mapbox_token()

    @api.model
    def _get_nominatim_url(self):
        """Get Nominatim server URL."""
        config = self.env["ir.config_parameter"].sudo()
        return config.get_param(
            "leaflet.nominatim_url", "https://nominatim.openstreetmap.org"
        )

    @api.model
    def geocode_address(self, address, country_code=None):
        """
        Geocode an address to coordinates.

        Args:
            address: String address to geocode
            country_code: Optional 2-letter ISO country code to limit results

        Returns:
            dict with 'lat', 'lng', 'display_name' or None if not found
        """
        provider = self._get_geocoding_provider()
        mapbox_token = self._get_mapbox_token()

        # Try MapBox first if token is configured
        if provider == "mapbox" or (provider == "auto" and mapbox_token):
            result = self._geocode_mapbox(address, country_code)
            if result:
                return result
            if provider == "mapbox":
                _logger.warning("MapBox geocoding failed, no fallback configured")
                return None

        # Fallback to Nominatim (OSM)
        return self._geocode_nominatim(address, country_code)

    @api.model
    @throttle_nominatim
    def _geocode_nominatim(self, address, country_code=None):
        """Geocode using Nominatim (OpenStreetMap)."""
        base_url = self._get_nominatim_url()
        url = f"{base_url}/search"

        params = {
            "q": address,
            "format": "json",
            "limit": 1,
            "addressdetails": 1,
        }
        if country_code:
            params["countrycodes"] = country_code.lower()

        headers = {
            "User-Agent": "Odoo-Leaflet-Map/1.0 (contact@yourcompany.com)",
        }

        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data:
                result = data[0]
                return {
                    "lat": float(result["lat"]),
                    "lng": float(result["lon"]),
                    "display_name": result.get("display_name", address),
                    "provider": "nominatim",
                }
            return None

        except requests.RequestException as e:
            _logger.warning("Nominatim geocoding failed: %s", e)
            return None

    @api.model
    def _geocode_mapbox(self, address, country_code=None):
        """Geocode using MapBox API."""
        token = self._get_mapbox_token()
        if not token:
            return None

        import urllib.parse

        encoded_address = urllib.parse.quote(address)
        url = (
            f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded_address}.json"
        )

        params = {
            "access_token": token,
            "limit": 1,
        }
        if country_code:
            params["country"] = country_code.lower()

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            features = data.get("features", [])
            if features:
                result = features[0]
                coords = result["geometry"]["coordinates"]
                return {
                    "lat": coords[1],
                    "lng": coords[0],
                    "display_name": result.get("place_name", address),
                    "provider": "mapbox",
                }
            return None

        except requests.RequestException as e:
            _logger.warning("MapBox geocoding failed: %s", e)
            return None

    @api.model
    def reverse_geocode(self, lat, lng):
        """
        Reverse geocode coordinates to an address.

        Args:
            lat: Latitude
            lng: Longitude

        Returns:
            dict with 'address', 'display_name' or None if not found
        """
        provider = self._get_geocoding_provider()
        mapbox_token = self._get_mapbox_token()

        # Try MapBox first if token is configured
        if provider == "mapbox" or (provider == "auto" and mapbox_token):
            result = self._reverse_geocode_mapbox(lat, lng)
            if result:
                return result

        # Fallback to Nominatim
        return self._reverse_geocode_nominatim(lat, lng)

    @api.model
    @throttle_nominatim
    def _reverse_geocode_nominatim(self, lat, lng):
        """Reverse geocode using Nominatim (OpenStreetMap)."""
        base_url = self._get_nominatim_url()
        url = f"{base_url}/reverse"

        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1,
        }

        headers = {
            "User-Agent": "Odoo-Leaflet-Map/1.0 (contact@yourcompany.com)",
        }

        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data and "address" in data:
                return {
                    "address": data.get("address", {}),
                    "display_name": data.get("display_name", ""),
                    "provider": "nominatim",
                }
            return None

        except requests.RequestException as e:
            _logger.warning("Nominatim reverse geocoding failed: %s", e)
            return None

    @api.model
    def _reverse_geocode_mapbox(self, lat, lng):
        """Reverse geocode using MapBox API."""
        token = self._get_mapbox_token()
        if not token:
            return None

        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json"
        params = {
            "access_token": token,
            "limit": 1,
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            features = data.get("features", [])
            if features:
                result = features[0]
                return {
                    "address": result.get("context", {}),
                    "display_name": result.get("place_name", ""),
                    "provider": "mapbox",
                }
            return None

        except requests.RequestException as e:
            _logger.warning("MapBox reverse geocoding failed: %s", e)
            return None

    @api.model
    def validate_coordinates(self, lat, lng):
        """
        Validate that coordinates are within valid ranges.

        Args:
            lat: Latitude (-90 to 90)
            lng: Longitude (-180 to 180)

        Returns:
            bool: True if valid, False otherwise
        """
        try:
            lat = float(lat)
            lng = float(lng)
            return -90 <= lat <= 90 and -180 <= lng <= 180
        except (TypeError, ValueError):
            return False

    @api.model
    def batch_geocode(self, addresses, country_code=None, delay_ms=None):
        """
        Batch geocode multiple addresses with rate limiting.

        Args:
            addresses: List of address strings
            country_code: Optional country code to limit results
            delay_ms: Optional delay between requests (default: provider-specific)

        Returns:
            List of geocoding results (or None for failed lookups)
        """
        results = []
        for address in addresses:
            result = self.geocode_address(address, country_code)
            results.append(result)
            # Additional delay if specified (on top of provider throttling)
            if delay_ms:
                time.sleep(delay_ms / 1000)
        return results
