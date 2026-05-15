/** @odoo-module */

import {loadJS} from "@web/core/assets";

const LIB_PATHS = {
    ol: "/base_geoengine/static/lib/ol-10.8.0/ol.js",
    chroma: "/base_geoengine/static/lib/chromajs-3.2.0/chroma.js",
    geostats: "/base_geoengine/static/lib/geostats-2.1.0/geostats.js",
};

let _loadPromise = null;

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
