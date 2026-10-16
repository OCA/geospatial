/** @odoo-module **/

/* global ol */

/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

/**
 * Tile URL templates keyed by map type name.
 */
export const TILE_URLS = {
    mapnik: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    cyclemap: "https://tile.thunderforest.com/cycle/{z}/{x}/{y}@2x.png?apikey=...",
    cyclosm: "https://{a-c}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    mobility: "https://tile.thunderforest.com/transport/{z}/{x}/{y}@2x.png?apikey=...",
    topo: "https://tile.tracestrack.com/topo__/{z}/{x}/{y}.png?key=...",
    hot: "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
};

/**
 * Create an OpenLayers map with an OSM tile layer and a stores vector layer.
 *
 * @param {HTMLElement} mapElement - The DOM element that will contain the map.
 * @param {String} mapType - Key into {@link TILE_URLS} (e.g. "mapnik").
 * @returns {{ map: ol.Map, stores: ol.layer.Vector }}
 */
export function createOlMap(mapElement, mapType) {
    const storesSource = new ol.source.Vector();
    const stores = new ol.layer.Vector({source: storesSource});

    const map = new ol.Map({
        target: mapElement,
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM({url: TILE_URLS[mapType]}),
            }),
            stores,
        ],
        view: new ol.View({
            projection: "EPSG:3857",
            center: ol.proj.fromLonLat([6, 46]),
            zoom: 8,
            minResolution: 0.299,
        }),
    });

    return {map, stores};
}

/**
 * Remove everything the flexdatalist plugin injected into the search block
 * (alias <ul>, selected query chips) and restore the original <input>.
 * Pure DOM so it works whether or not jQuery/flexdatalist are loaded.
 *
 * @param {HTMLElement} root - The .s_openlayer_store_locator element.
 */
export function resetStoreSearch(root) {
    const searchEl = root?.querySelector(".search");
    if (!searchEl) {
        return;
    }
    for (const el of searchEl.querySelectorAll("ul.flexdatalist-multiple")) {
        el.remove();
    }
    for (const el of root.querySelectorAll("div.search-callout")) {
        el.remove();
    }

    const input = searchEl.querySelector("input#search");
    if (input) {
        input.classList.remove("flexdatalist-set");
        input.removeAttribute("style");
        input.removeAttribute("tabindex");
        input.removeAttribute("value");
        input.value = "";
    }
}
