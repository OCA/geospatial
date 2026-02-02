# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

import logging

import requests

from odoo import api, models

_logger = logging.getLogger(__name__)


class RoutingMixin(models.AbstractModel):
    """Mixin providing routing capabilities using OSRM or MapBox."""

    _name = "leaflet.routing.mixin"
    _description = "Leaflet Routing Mixin"

    @api.model
    def _get_routing_provider(self):
        """Get the configured routing provider."""
        config = self.env["ir.config_parameter"].sudo()
        return config.get_param("leaflet.routing_provider", "osrm")

    @api.model
    def _get_osrm_url(self):
        """Get OSRM server URL."""
        config = self.env["ir.config_parameter"].sudo()
        return config.get_param("leaflet.osrm_url", "https://router.project-osrm.org")

    @api.model
    def _get_mapbox_token(self):
        """Get MapBox API token if configured."""
        config = self.env["ir.config_parameter"].sudo()
        return config.get_param("leaflet.mapbox_token", "")

    @api.model
    def _get_max_waypoints(self):
        """Get maximum waypoints for routing."""
        config = self.env["ir.config_parameter"].sudo()
        return int(config.get_param("leaflet.max_waypoints", "25"))

    @api.model
    def get_route(self, waypoints, profile="driving"):
        """
        Get a route between waypoints.

        Args:
            waypoints: List of [lat, lng] coordinate pairs
            profile: Routing profile (driving, walking, cycling)

        Returns:
            dict with:
                - geometry: List of [lat, lng] coordinates for polyline
                - distance: Total distance in meters
                - duration: Total duration in seconds
                - legs: Route segments between waypoints
        """
        if len(waypoints) < 2:
            return None

        max_waypoints = self._get_max_waypoints()
        if len(waypoints) > max_waypoints:
            _logger.warning(
                "Too many waypoints (%d), truncating to %d",
                len(waypoints),
                max_waypoints,
            )
            waypoints = waypoints[:max_waypoints]

        provider = self._get_routing_provider()
        mapbox_token = self._get_mapbox_token()

        # Try MapBox first if configured
        if provider == "mapbox" or (provider == "auto" and mapbox_token):
            result = self._get_route_mapbox(waypoints, profile)
            if result:
                return result
            if provider == "mapbox":
                _logger.warning("MapBox routing failed, no fallback configured")
                return None

        # Fallback to OSRM
        return self._get_route_osrm(waypoints, profile)

    @api.model
    def _get_route_osrm(self, waypoints, profile="driving"):
        """Get route using OSRM API."""
        base_url = self._get_osrm_url()

        # OSRM expects lng,lat order
        coords = ";".join([f"{wp[1]},{wp[0]}" for wp in waypoints])
        url = f"{base_url}/route/v1/{profile}/{coords}"

        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("OSRM routing failed: %s", data.get("message"))
                return None

            route = data["routes"][0]

            # Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            geometry = [
                [coord[1], coord[0]] for coord in route["geometry"]["coordinates"]
            ]

            return {
                "geometry": geometry,
                "distance": route["distance"],
                "duration": route["duration"],
                "legs": [
                    {
                        "distance": leg["distance"],
                        "duration": leg["duration"],
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
            _logger.warning("OSRM routing request failed: %s", e)
            return None

    @api.model
    def _get_route_mapbox(self, waypoints, profile="driving"):
        """Get route using MapBox Directions API."""
        token = self._get_mapbox_token()
        if not token:
            return None

        # Map profile names to MapBox profiles
        profile_map = {
            "driving": "driving",
            "walking": "walking",
            "cycling": "cycling",
        }
        mapbox_profile = profile_map.get(profile, "driving")

        # MapBox expects lng,lat order
        coords = ";".join([f"{wp[1]},{wp[0]}" for wp in waypoints])
        url = f"https://api.mapbox.com/directions/v5/mapbox/{mapbox_profile}/{coords}"

        params = {
            "access_token": token,
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("MapBox routing failed: %s", data.get("message"))
                return None

            route = data["routes"][0]

            # Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            geometry = [
                [coord[1], coord[0]] for coord in route["geometry"]["coordinates"]
            ]

            return {
                "geometry": geometry,
                "distance": route["distance"],
                "duration": route["duration"],
                "legs": [
                    {
                        "distance": leg["distance"],
                        "duration": leg["duration"],
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

    @api.model
    def get_optimized_route(self, waypoints, profile="driving", roundtrip=False):
        """
        Get an optimized route visiting all waypoints (TSP).

        Args:
            waypoints: List of [lat, lng] coordinate pairs
            profile: Routing profile
            roundtrip: Whether to return to the starting point

        Returns:
            dict with optimized route and waypoint ordering
        """
        if len(waypoints) < 2:
            return None

        provider = self._get_routing_provider()
        mapbox_token = self._get_mapbox_token()

        # Try MapBox first if configured (has optimization API)
        if provider == "mapbox" or (provider == "auto" and mapbox_token):
            result = self._get_optimized_route_mapbox(waypoints, profile, roundtrip)
            if result:
                return result

        # Fallback to OSRM trip endpoint
        return self._get_optimized_route_osrm(waypoints, profile, roundtrip)

    @api.model
    def _get_optimized_route_osrm(self, waypoints, profile="driving", roundtrip=False):
        """Get optimized route using OSRM Trip API."""
        base_url = self._get_osrm_url()

        # OSRM expects lng,lat order
        coords = ";".join([f"{wp[1]},{wp[0]}" for wp in waypoints])
        url = f"{base_url}/trip/v1/{profile}/{coords}"

        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "roundtrip": "true" if roundtrip else "false",
            "source": "first",
            "destination": "last",
        }

        try:
            response = requests.get(url, params=params, timeout=60)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("OSRM trip failed: %s", data.get("message"))
                return None

            trip = data["trips"][0]

            # Get waypoint ordering
            waypoint_order = [wp["waypoint_index"] for wp in data["waypoints"]]

            # Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            geometry = [
                [coord[1], coord[0]] for coord in trip["geometry"]["coordinates"]
            ]

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

    @api.model
    def _get_optimized_route_mapbox(
        self, waypoints, profile="driving", roundtrip=False
    ):
        """Get optimized route using MapBox Optimization API."""
        token = self._get_mapbox_token()
        if not token:
            return None

        # Map profile names
        profile_map = {
            "driving": "driving",
            "walking": "walking",
            "cycling": "cycling",
        }
        mapbox_profile = profile_map.get(profile, "driving")

        # MapBox expects lng,lat order
        coords = ";".join([f"{wp[1]},{wp[0]}" for wp in waypoints])
        url = (
            f"https://api.mapbox.com/optimized-trips/v1/"
            f"mapbox/{mapbox_profile}/{coords}"
        )

        params = {
            "access_token": token,
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "roundtrip": "true" if roundtrip else "false",
            "source": "first",
            "destination": "last",
        }

        try:
            response = requests.get(url, params=params, timeout=60)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("MapBox optimization failed: %s", data.get("message"))
                return None

            trip = data["trips"][0]

            # Get waypoint ordering
            waypoint_order = [wp["waypoint_index"] for wp in data["waypoints"]]

            # Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            geometry = [
                [coord[1], coord[0]] for coord in trip["geometry"]["coordinates"]
            ]

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

    @api.model
    def get_distance_matrix(self, origins, destinations=None):
        """
        Get distance matrix between origins and destinations.

        Args:
            origins: List of [lat, lng] coordinate pairs
            destinations: List of [lat, lng] pairs (defaults to origins)

        Returns:
            dict with:
                - distances: 2D list of distances in meters
                - durations: 2D list of durations in seconds
        """
        if destinations is None:
            destinations = origins

        # OSRM supports table API
        return self._get_distance_matrix_osrm(origins, destinations)

    @api.model
    def _get_distance_matrix_osrm(self, origins, destinations):
        """Get distance matrix using OSRM Table API."""
        base_url = self._get_osrm_url()

        # Combine all coordinates
        all_coords = origins + destinations
        coords = ";".join([f"{wp[1]},{wp[0]}" for wp in all_coords])

        # Build source and destination indices
        source_indices = list(range(len(origins)))
        dest_indices = list(range(len(origins), len(all_coords)))

        url = f"{base_url}/table/v1/driving/{coords}"

        params = {
            "sources": ";".join(map(str, source_indices)),
            "destinations": ";".join(map(str, dest_indices)),
            "annotations": "distance,duration",
        }

        try:
            response = requests.get(url, params=params, timeout=60)
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                _logger.warning("OSRM table failed: %s", data.get("message"))
                return None

            return {
                "distances": data.get("distances", []),
                "durations": data.get("durations", []),
                "provider": "osrm",
            }

        except requests.RequestException as e:
            _logger.warning("OSRM table request failed: %s", e)
            return None
