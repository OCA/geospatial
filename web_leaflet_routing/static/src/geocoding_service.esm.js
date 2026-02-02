/** @odoo-module **/

/* global console, fetch, URLSearchParams, setTimeout */

import {session} from "@web/session";

/**
 * GeocodingService provides geocoding functionality using Nominatim (OSM) or MapBox.
 * Default provider is Nominatim (free, but requires rate limiting of 1 req/sec).
 */
export class GeocodingService {
    constructor() {
        this.nominatimUrl =
            session["leaflet.nominatim_url"] || "https://nominatim.openstreetmap.org";
        this.mapboxToken = session["leaflet.mapbox_token"] || "";
        this.provider = session["leaflet.geocoding_provider"] || "nominatim";
        this.throttleMs = session["leaflet.geocoding_throttle_ms"] || 1000;

        this._lastRequestTime = 0;
        this._requestQueue = [];
        this._processing = false;
    }

    /**
     * Throttle requests to respect API rate limits.
     * @returns {Promise<void>}
     */
    async _throttle() {
        const now = Date.now();
        const elapsed = now - this._lastRequestTime;

        if (elapsed < this.throttleMs) {
            await new Promise((resolve) =>
                setTimeout(resolve, this.throttleMs - elapsed)
            );
        }

        this._lastRequestTime = Date.now();
    }

    /**
     * Geocode an address to coordinates.
     * @param {String} address - Address to geocode
     * @param {String} countryCode - Optional 2-letter ISO country code
     * @returns {Promise<Object|null>} Object with lat, lng, display_name or null
     */
    async geocode(address, countryCode = null) {
        if (!address || address.trim() === "") {
            return null;
        }

        // Try MapBox first if configured
        if (
            this.provider === "mapbox" ||
            (this.provider === "auto" && this.mapboxToken)
        ) {
            const result = await this._geocodeMapBox(address, countryCode);
            if (result) {
                return result;
            }
            if (this.provider === "mapbox") {
                console.warn("MapBox geocoding failed, no fallback");
                return null;
            }
        }

        // Fallback to Nominatim
        return this._geocodeNominatim(address, countryCode);
    }

    /**
     * Geocode using Nominatim (OSM).
     * @param {String} address
     * @param {String} countryCode
     * @returns {Promise<Object|null>}
     */
    async _geocodeNominatim(address, countryCode = null) {
        await this._throttle();

        const params = new URLSearchParams({
            q: address,
            format: "json",
            limit: "1",
            addressdetails: "1",
        });

        if (countryCode) {
            params.append("countrycodes", countryCode.toLowerCase());
        }

        const url = `${this.nominatimUrl}/search?${params}`;

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Odoo-Leaflet-Map/1.0",
                },
            });

            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    displayName: result.display_name,
                    address: result.address,
                    provider: "nominatim",
                };
            }

            return null;
        } catch (error) {
            console.error("Nominatim geocoding failed:", error);
            return null;
        }
    }

    /**
     * Geocode using MapBox Geocoding API.
     * @param {String} address
     * @param {String} countryCode
     * @returns {Promise<Object|null>}
     */
    async _geocodeMapBox(address, countryCode = null) {
        if (!this.mapboxToken) {
            return null;
        }

        const encodedAddress = encodeURIComponent(address);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json`;

        const params = new URLSearchParams({
            access_token: this.mapboxToken,
            limit: "1",
        });

        if (countryCode) {
            params.append("country", countryCode.toLowerCase());
        }

        try {
            const response = await fetch(`${url}?${params}`);
            const data = await response.json();

            const features = data.features || [];
            if (features.length > 0) {
                const result = features[0];
                const [lng, lat] = result.geometry.coordinates;
                return {
                    lat,
                    lng,
                    displayName: result.place_name,
                    address: result.context || {},
                    provider: "mapbox",
                };
            }

            return null;
        } catch (error) {
            console.error("MapBox geocoding failed:", error);
            return null;
        }
    }

    /**
     * Reverse geocode coordinates to an address.
     * @param {Number} lat - Latitude
     * @param {Number} lng - Longitude
     * @returns {Promise<Object|null>}
     */
    async reverseGeocode(lat, lng) {
        // Validate coordinates
        if (!this._validateCoordinates(lat, lng)) {
            return null;
        }

        // Try MapBox first if configured
        if (
            this.provider === "mapbox" ||
            (this.provider === "auto" && this.mapboxToken)
        ) {
            const result = await this._reverseGeocodeMapBox(lat, lng);
            if (result) {
                return result;
            }
        }

        // Fallback to Nominatim
        return this._reverseGeocodeNominatim(lat, lng);
    }

    /**
     * Reverse geocode using Nominatim.
     * @param {Number} lat
     * @param {Number} lng
     * @returns {Promise<Object|null>}
     */
    async _reverseGeocodeNominatim(lat, lng) {
        await this._throttle();

        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lng.toString(),
            format: "json",
            addressdetails: "1",
        });

        const url = `${this.nominatimUrl}/reverse?${params}`;

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Odoo-Leaflet-Map/1.0",
                },
            });

            const data = await response.json();

            if (data && data.address) {
                return {
                    address: data.address,
                    displayName: data.display_name,
                    provider: "nominatim",
                };
            }

            return null;
        } catch (error) {
            console.error("Nominatim reverse geocoding failed:", error);
            return null;
        }
    }

    /**
     * Reverse geocode using MapBox.
     * @param {Number} lat
     * @param {Number} lng
     * @returns {Promise<Object|null>}
     */
    async _reverseGeocodeMapBox(lat, lng) {
        if (!this.mapboxToken) {
            return null;
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;

        const params = new URLSearchParams({
            access_token: this.mapboxToken,
            limit: "1",
        });

        try {
            const response = await fetch(`${url}?${params}`);
            const data = await response.json();

            const features = data.features || [];
            if (features.length > 0) {
                const result = features[0];
                return {
                    address: result.context || {},
                    displayName: result.place_name,
                    provider: "mapbox",
                };
            }

            return null;
        } catch (error) {
            console.error("MapBox reverse geocoding failed:", error);
            return null;
        }
    }

    /**
     * Batch geocode multiple addresses.
     * @param {Array<string>} addresses
     * @param {String} countryCode
     * @returns {Promise<Array<Object|null>>}
     */
    async batchGeocode(addresses, countryCode = null) {
        const results = [];

        for (const address of addresses) {
            const result = await this.geocode(address, countryCode);
            results.push(result);
        }

        return results;
    }

    /**
     * Validate coordinates.
     * @param {Number} lat
     * @param {Number} lng
     * @returns {Boolean}
     */
    _validateCoordinates(lat, lng) {
        return (
            typeof lat === "number" &&
            typeof lng === "number" &&
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
        );
    }

    /**
     * Search for places/addresses with autocomplete.
     * @param {String} query
     * @param {Object} options - bbox, countryCode, limit
     * @returns {Promise<Array>}
     */
    async autocomplete(query, options = {}) {
        if (!query || query.length < 3) {
            return [];
        }

        // MapBox has better autocomplete, try it first
        if (
            this.provider === "mapbox" ||
            (this.provider === "auto" && this.mapboxToken)
        ) {
            const results = await this._autocompleteMapBox(query, options);
            if (results && results.length > 0) {
                return results;
            }
        }

        // Fallback to Nominatim search
        return this._autocompleteNominatim(query, options);
    }

    /**
     * Autocomplete using Nominatim.
     * @param {String} query
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async _autocompleteNominatim(query, options = {}) {
        await this._throttle();

        const params = new URLSearchParams({
            q: query,
            format: "json",
            limit: (options.limit || 5).toString(),
            addressdetails: "1",
        });

        if (options.countryCode) {
            params.append("countrycodes", options.countryCode.toLowerCase());
        }

        if (options.bbox) {
            const [minLng, minLat, maxLng, maxLat] = options.bbox;
            params.append("viewbox", `${minLng},${maxLat},${maxLng},${minLat}`);
            params.append("bounded", "1");
        }

        const url = `${this.nominatimUrl}/search?${params}`;

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Odoo-Leaflet-Map/1.0",
                },
            });

            const data = await response.json();

            return (data || []).map((item) => ({
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                displayName: item.display_name,
                address: item.address,
                type: item.type,
                provider: "nominatim",
            }));
        } catch (error) {
            console.error("Nominatim autocomplete failed:", error);
            return [];
        }
    }

    /**
     * Autocomplete using MapBox.
     * @param {String} query
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async _autocompleteMapBox(query, options = {}) {
        if (!this.mapboxToken) {
            return [];
        }

        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json`;

        const params = new URLSearchParams({
            access_token: this.mapboxToken,
            limit: (options.limit || 5).toString(),
            autocomplete: "true",
        });

        if (options.countryCode) {
            params.append("country", options.countryCode.toLowerCase());
        }

        if (options.bbox) {
            const [minLng, minLat, maxLng, maxLat] = options.bbox;
            params.append("bbox", `${minLng},${minLat},${maxLng},${maxLat}`);
        }

        try {
            const response = await fetch(`${url}?${params}`);
            const data = await response.json();

            return (data.features || []).map((item) => {
                const [lng, lat] = item.geometry.coordinates;
                return {
                    lat,
                    lng,
                    displayName: item.place_name,
                    address: item.context || {},
                    type: item.place_type?.[0] || "place",
                    provider: "mapbox",
                };
            });
        } catch (error) {
            console.error("MapBox autocomplete failed:", error);
            return [];
        }
    }
}

// Export singleton instance
export const geocodingService = new GeocodingService();
