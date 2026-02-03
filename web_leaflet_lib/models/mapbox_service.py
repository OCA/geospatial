# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

"""
MapBox Directions API client.

Pure Python implementation with no Odoo dependencies.
Can be used standalone or through the RoutingServiceFactory.
"""

import logging

import requests

_logger = logging.getLogger(__name__)


class MapBoxService:
    """
    MapBox Directions API client.

    Provides methods for:
    - Getting routes between waypoints
    - Route optimization (Optimization API)

    Requires a valid MapBox access token.
    """

    BASE_URL = "https://api.mapbox.com"
    TIMEOUT = 60

    # Map common profile names to MapBox profiles
    PROFILE_MAP = {
        "driving": "driving",
        "walking": "walking",
        "cycling": "cycling",
        "car": "driving",
        "foot": "walking",
        "bike": "cycling",
    }

    def __init__(self, access_token, profile="driving"):
        """
        Initialize MapBox service.

        Args:
            access_token: MapBox API access token
            profile: Default routing profile (driving, walking, cycling)
        """
        self.access_token = access_token
        self.profile = self.PROFILE_MAP.get(profile, "driving")

    def _format_coordinates(self, locations):
        """
        Format locations for MapBox API (expects lng,lat order).

        Args:
            locations: List of [lat, lng] or (lat, lng) coordinate pairs

        Returns:
            String of coordinates in "lng,lat;lng,lat" format
        """
        return ";".join([f"{loc[1]},{loc[0]}" for loc in locations])

    def _convert_geometry_to_latlng(self, geojson_coords):
        """
        Convert GeoJSON coordinates from [lng, lat] to [lat, lng].

        Args:
            geojson_coords: List of [lng, lat] coordinates

        Returns:
            List of [lat, lng] coordinates
        """
        return [[coord[1], coord[0]] for coord in geojson_coords]

    def _get_profile(self, profile=None):
        """Get MapBox profile name."""
        profile = profile or self.profile
        return self.PROFILE_MAP.get(profile, profile)

    def get_route(self, waypoints, profile=None):
        """
        Get route between waypoints using MapBox Directions API.

        Args:
            waypoints: List of [lat, lng] or (lat, lng) coordinate pairs
            profile: Routing profile (default: instance profile)

        Returns:
            dict with:
                - geometry: List of [lat, lng] for polyline
                - distance: Total distance in meters
                - duration: Total duration in seconds
                - legs: Route segments with distance, duration, and steps
            None if request fails
        """
        if not self.access_token:
            _logger.warning("MapBox access token not configured")
            return None

        if len(waypoints) < 2:
            return None

        profile = self._get_profile(profile)
        coords = self._format_coordinates(waypoints)
        url = f"{self.BASE_URL}/directions/v5/mapbox/{profile}/{coords}"

        params = {
            "access_token": self.access_token,
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }

        try:
            response = requests.get(url, params=params, timeout=self.TIMEOUT)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("MapBox routing failed: %s", data.get("message"))
                return None

            route = data["routes"][0]
            geometry = self._convert_geometry_to_latlng(
                route["geometry"]["coordinates"]
            )

            return {
                "geometry": geometry,
                "distance": route["distance"],
                "duration": route["duration"],
                "legs": [
                    {
                        "distance": leg["distance"],
                        "duration": leg["duration"],
                        "summary": leg.get("summary", ""),
                        "steps": [
                            {
                                "distance": step["distance"],
                                "duration": step["duration"],
                                "instruction": step.get("maneuver", {}).get(
                                    "instruction", ""
                                ),
                                "name": step.get("name", ""),
                            }
                            for step in leg.get("steps", [])
                        ],
                    }
                    for leg in route["legs"]
                ],
                "provider": "mapbox",
            }

        except requests.RequestException as e:
            _logger.warning("MapBox routing request failed: %s", e)
            return None

    def get_optimized_route(self, waypoints, profile=None, roundtrip=False):
        """
        Get TSP-optimized route using MapBox Optimization API.

        Args:
            waypoints: List of [lat, lng] or (lat, lng) coordinate pairs
            profile: Routing profile (default: instance profile)
            roundtrip: Whether to return to starting point

        Returns:
            dict with:
                - geometry: List of [lat, lng] for polyline
                - distance: Total distance in meters
                - duration: Total duration in seconds
                - waypoint_order: Optimized order of waypoint indices
                - optimized_waypoints: Waypoints reordered according to optimization
            None if request fails
        """
        if not self.access_token:
            _logger.warning("MapBox access token not configured")
            return None

        if len(waypoints) < 2:
            return None

        profile = self._get_profile(profile)
        coords = self._format_coordinates(waypoints)
        url = f"{self.BASE_URL}/optimized-trips/v1/mapbox/{profile}/{coords}"

        params = {
            "access_token": self.access_token,
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "roundtrip": "true" if roundtrip else "false",
            "source": "first",
            "destination": "last",
        }

        try:
            response = requests.get(url, params=params, timeout=self.TIMEOUT)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("MapBox optimization failed: %s", data.get("message"))
                return None

            trip = data["trips"][0]
            waypoint_order = [wp["waypoint_index"] for wp in data["waypoints"]]
            geometry = self._convert_geometry_to_latlng(trip["geometry"]["coordinates"])

            return {
                "geometry": geometry,
                "distance": trip["distance"],
                "duration": trip["duration"],
                "waypoint_order": waypoint_order,
                "optimized_waypoints": [waypoints[i] for i in waypoint_order],
                "provider": "mapbox",
            }

        except requests.RequestException as e:
            _logger.warning("MapBox optimization request failed: %s", e)
            return None

    def is_available(self):
        """
        Check if MapBox API is available and token is valid.

        Returns:
            bool: True if API responds with valid token, False otherwise
        """
        if not self.access_token:
            return False

        try:
            # Simple check using a geocoding request (smaller response)
            url = f"{self.BASE_URL}/geocoding/v5/mapbox.places/test.json"
            params = {"access_token": self.access_token, "limit": 1}
            response = requests.get(url, params=params, timeout=5)
            return response.status_code == 200
        except requests.RequestException:
            return False
