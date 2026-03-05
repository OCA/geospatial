/** @odoo-module */

/**
 * Shared library loading for GeoEngine components.
 * Centralizes the loading of third-party libraries (OpenLayers, chroma.js, geostats).
 */

import {loadJS} from "@web/core/assets";

// Library paths - single source of truth
const LIB_PATHS = {
    ol: "/base_geoengine/static/lib/ol-10.8.0/ol.js",
    chroma: "/base_geoengine/static/lib/chromajs-3.2.0/chroma.js",
    geostats: "/base_geoengine/static/lib/geostats-2.1.0/geostats.js",
};

// Track loading state to avoid duplicate loads
let _loadPromise = null;

/**
 * Load all GeoEngine libraries (ol, chroma, geostats).
 * Safe to call multiple times - libraries are only loaded once.
 * @returns {Promise<{ol: object, chroma: Function, geostats: Function}>}
 */
export async function loadGeoengineLibs() {
    if (!_loadPromise) {
        _loadPromise = (async () => {
            if (!window.ol) {
                await loadJS(LIB_PATHS.ol);
            }
            if (!window.chroma) {
                await loadJS(LIB_PATHS.chroma);
            }
            if (!window.geostats) {
                await loadJS(LIB_PATHS.geostats);
            }
            return {
                ol: window.ol,
                chroma: window.chroma,
                geostats: window.geostats,
            };
        })();
    }
    return _loadPromise;
}

/**
 * Load only OpenLayers and chroma (for field widgets that don't need geostats).
 * @returns {Promise<{ol: object, chroma: Function}>}
 */
export async function loadMapLibs() {
    if (!window.ol) {
        await loadJS(LIB_PATHS.ol);
    }
    if (!window.chroma) {
        await loadJS(LIB_PATHS.chroma);
    }
    return {
        ol: window.ol,
        chroma: window.chroma,
    };
}
