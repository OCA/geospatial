# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

"""
Routing Service Factory.

Provides Odoo-aware instantiation of routing services (OSRM, MapBox)
based on system configuration parameters.
"""

import logging

from .mapbox_service import MapBoxService
from .osrm_service import OSRMService

_logger = logging.getLogger(__name__)


class RoutingServiceFactory:
    """
    Factory for creating routing service instances based on Odoo configuration.

    Configuration Parameters:
        - leaflet.routing_provider: Provider selection ('osrm', 'mapbox', 'auto')
        - leaflet.osrm_url: OSRM server URL
        - leaflet.mapbox_token: MapBox API token
        - leaflet.max_waypoints: Maximum waypoints for routing

    The factory also supports legacy TMS configuration:
        - tms.osrm_server_url: Falls back to this if leaflet.osrm_url not set
    """

    # Default configuration keys
    PARAM_ROUTING_PROVIDER = "leaflet.routing_provider"
    PARAM_OSRM_URL = "leaflet.osrm_url"
    PARAM_MAPBOX_TOKEN = "leaflet.mapbox_token"
    PARAM_MAX_WAYPOINTS = "leaflet.max_waypoints"

    # Legacy TMS configuration (for backwards compatibility)
    PARAM_TMS_OSRM_URL = "tms.osrm_server_url"

    # Defaults
    DEFAULT_PROVIDER = "osrm"
    DEFAULT_MAX_WAYPOINTS = 25

    def __init__(self, env):
        """
        Initialize the factory with Odoo environment.

        Args:
            env: Odoo Environment (self.env from a model)
        """
        self.env = env
        self._config = None

    def _get_config(self):
        """Get configuration parameter accessor (cached)."""
        if self._config is None:
            self._config = self.env["ir.config_parameter"].sudo()
        return self._config

    def get_routing_provider(self):
        """Get the configured routing provider name."""
        return self._get_config().get_param(
            self.PARAM_ROUTING_PROVIDER, self.DEFAULT_PROVIDER
        )

    def get_osrm_url(self):
        """
        Get OSRM server URL from configuration.

        Priority:
            1. leaflet.osrm_url
            2. tms.osrm_server_url (legacy)
            3. OSRMService.DEFAULT_URL
        """
        config = self._get_config()
        return (
            config.get_param(self.PARAM_OSRM_URL)
            or config.get_param(self.PARAM_TMS_OSRM_URL)
            or OSRMService.DEFAULT_URL
        )

    def get_mapbox_token(self):
        """Get MapBox API token from configuration."""
        return self._get_config().get_param(self.PARAM_MAPBOX_TOKEN, "")

    def get_max_waypoints(self):
        """Get maximum waypoints for routing."""
        return int(
            self._get_config().get_param(
                self.PARAM_MAX_WAYPOINTS, self.DEFAULT_MAX_WAYPOINTS
            )
        )

    def get_osrm_service(self, profile="driving"):
        """
        Get configured OSRM service instance.

        Args:
            profile: Routing profile (driving, walking, cycling)

        Returns:
            OSRMService instance
        """
        return OSRMService(base_url=self.get_osrm_url(), profile=profile)

    def get_mapbox_service(self, profile="driving"):
        """
        Get configured MapBox service instance.

        Args:
            profile: Routing profile (driving, walking, cycling)

        Returns:
            MapBoxService instance or None if token not configured
        """
        token = self.get_mapbox_token()
        if not token:
            return None
        return MapBoxService(access_token=token, profile=profile)

    def get_service(self, provider=None, profile="driving"):
        """
        Get routing service based on configuration or explicit provider.

        Args:
            provider: Explicit provider name ('osrm', 'mapbox', 'auto')
                     If None, uses configured provider
            profile: Routing profile (driving, walking, cycling)

        Returns:
            OSRMService or MapBoxService instance

        The 'auto' provider tries MapBox first (if token configured),
        then falls back to OSRM.
        """
        provider = provider or self.get_routing_provider()

        if provider == "mapbox":
            service = self.get_mapbox_service(profile)
            if service:
                return service
            _logger.warning(
                "MapBox requested but token not configured, falling back to OSRM"
            )
            return self.get_osrm_service(profile)

        if provider == "auto":
            # Try MapBox first if token is configured
            mapbox_token = self.get_mapbox_token()
            if mapbox_token:
                return self.get_mapbox_service(profile)
            return self.get_osrm_service(profile)

        # Default to OSRM
        return self.get_osrm_service(profile)

    def get_route(self, waypoints, profile="driving", provider=None):
        """
        Convenience method to get a route using configured service.

        Args:
            waypoints: List of [lat, lng] coordinate pairs
            profile: Routing profile
            provider: Explicit provider (optional)

        Returns:
            Route dict or None
        """
        max_waypoints = self.get_max_waypoints()
        if len(waypoints) > max_waypoints:
            _logger.warning(
                "Too many waypoints (%d), truncating to %d",
                len(waypoints),
                max_waypoints,
            )
            waypoints = waypoints[:max_waypoints]

        service = self.get_service(provider, profile)
        return service.get_route(waypoints)

    def get_optimized_route(
        self, waypoints, profile="driving", roundtrip=False, provider=None
    ):
        """
        Convenience method to get an optimized route using configured service.

        Args:
            waypoints: List of [lat, lng] coordinate pairs
            profile: Routing profile
            roundtrip: Whether to return to starting point
            provider: Explicit provider (optional)

        Returns:
            Optimized route dict or None
        """
        service = self.get_service(provider, profile)
        return service.get_optimized_route(waypoints, roundtrip=roundtrip)

    def get_distance_matrix(self, origins, destinations=None):
        """
        Get distance matrix using OSRM (MapBox doesn't support matrix API).

        Args:
            origins: List of [lat, lng] coordinate pairs
            destinations: List of [lat, lng] pairs (defaults to origins)

        Returns:
            Distance matrix dict or None
        """
        osrm = self.get_osrm_service()

        if destinations is None:
            return osrm.get_distance_matrix(origins)

        # OSRM table API with separate sources/destinations
        all_coords = origins + destinations
        coords = osrm._format_coordinates(all_coords)

        source_indices = list(range(len(origins)))
        dest_indices = list(range(len(origins), len(all_coords)))

        import requests

        url = f"{osrm.base_url}/table/v1/driving/{coords}"
        params = {
            "sources": ";".join(map(str, source_indices)),
            "destinations": ";".join(map(str, dest_indices)),
            "annotations": "distance,duration",
        }

        try:
            response = requests.get(url, params=params, timeout=osrm.TIMEOUT)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("OSRM table failed: %s", data.get("message"))
                return None

            distances = data.get("distances", [])
            distances_km = [
                [d / 1000 if d is not None else None for d in row] for row in distances
            ]

            return {
                "distances": distances,
                "durations": data.get("durations", []),
                "distances_km": distances_km,
                "provider": "osrm",
            }

        except requests.RequestException as e:
            _logger.warning("OSRM table request failed: %s", e)
            return None
