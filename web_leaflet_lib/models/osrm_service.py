# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

"""
OSRM (Open Source Routing Machine) API client.

Pure Python implementation with no Odoo dependencies.
Can be used standalone or through the RoutingServiceFactory.
"""

import logging

import requests

_logger = logging.getLogger(__name__)


class OSRMService:
    """
    OSRM (Open Source Routing Machine) API client.

    Provides methods for:
    - Getting distance/duration matrices between multiple locations
    - Getting route geometry for visualization (polylines)
    - Route optimization (trip API)

    Default server: https://router.project-osrm.org (public demo server)
    For production, consider self-hosting OSRM.
    """

    DEFAULT_URL = "https://router.project-osrm.org"
    TIMEOUT = 60

    def __init__(self, base_url=None, profile="driving"):
        """
        Initialize OSRM service.

        Args:
            base_url: OSRM server URL (default: public server)
            profile: Default routing profile (driving, walking, cycling)
        """
        self.base_url = (base_url or self.DEFAULT_URL).rstrip("/")
        self.profile = profile

    def _format_coordinates(self, locations):
        """
        Format locations for OSRM API (expects lng,lat order).

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

    def get_distance_matrix(self, locations, profile=None):
        """
        Get distance and duration matrix between locations using OSRM Table API.

        Args:
            locations: List of [lat, lng] or (lat, lng) coordinate pairs
            profile: Routing profile (default: instance profile)

        Returns:
            dict with:
                - distances: 2D list of distances in meters
                - durations: 2D list of durations in seconds
                - distances_km: 2D list of distances in kilometers (for VRP)
            None if request fails
        """
        if len(locations) < 2:
            return None

        profile = profile or self.profile
        coords = self._format_coordinates(locations)
        url = f"{self.base_url}/table/v1/{profile}/{coords}"

        params = {
            "annotations": "distance,duration",
        }

        try:
            response = requests.get(url, params=params, timeout=self.TIMEOUT)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("OSRM table failed: %s", data.get("message"))
                return None

            # Convert distances from meters to kilometers
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

    def get_route(self, waypoints, profile=None):
        """
        Get route between waypoints including geometry for polylines.

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
        if len(waypoints) < 2:
            return None

        profile = profile or self.profile
        coords = self._format_coordinates(waypoints)
        url = f"{self.base_url}/route/v1/{profile}/{coords}"

        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }

        try:
            response = requests.get(url, params=params, timeout=self.TIMEOUT)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("OSRM route failed: %s", data.get("message"))
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
                "provider": "osrm",
            }

        except requests.RequestException as e:
            _logger.warning("OSRM route request failed: %s", e)
            return None

    def get_optimized_route(self, waypoints, profile=None, roundtrip=False):
        """
        Get TSP-optimized route visiting all waypoints using OSRM Trip API.

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
        if len(waypoints) < 2:
            return None

        profile = profile or self.profile
        coords = self._format_coordinates(waypoints)
        url = f"{self.base_url}/trip/v1/{profile}/{coords}"

        params = {
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
                _logger.warning("OSRM trip failed: %s", data.get("message"))
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
                "provider": "osrm",
            }

        except requests.RequestException as e:
            _logger.warning("OSRM trip request failed: %s", e)
            return None

    def is_available(self):
        """
        Check if OSRM server is available.

        Returns:
            bool: True if server responds, False otherwise
        """
        try:
            # Simple health check - get route between two close points
            test_coords = "-43.1729,-22.9068;-43.1739,-22.9078"  # Rio de Janeiro
            url = f"{self.base_url}/route/v1/driving/{test_coords}"
            response = requests.get(url, timeout=5)
            return response.status_code == 200
        except requests.RequestException:
            return False
