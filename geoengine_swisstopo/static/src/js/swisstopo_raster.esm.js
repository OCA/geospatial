/** @odoo-module */

/* global ol */

/**
 * Configuration WMTS Swisstopo pour EPSG:2056 (CH1903+ / LV95 / MN95).
 *
 * Résolutions officielles geo.admin.ch :
 * https://api3.geo.admin.ch/services/sdiservices.html#wmts
 */

export const SWISSTOPO_RESOLUTIONS = [
    4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750,
    650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.1,
];

// Origine de la grille de tuiles Swisstopo (coin supérieur gauche de l'étendue LV95)
const SWISSTOPO_TILE_ORIGIN = [2420000, 1350000];

// Étendue nationale CH en LV95 / EPSG:2056
export const SWISSTOPO_EXTENT_2056 = [2420000, 1030000, 2900000, 1350000];

/**
 * Construit une ol.source.WMTS pour une couche Swisstopo en EPSG:2056.
 *
 * @param {String} layerName  ex: 'ch.swisstopo.pixelkarte-farbe'
 * @param {String} format     'jpeg' ou 'png' selon la couche
 * @returns {ol.source.WMTS}
 */
export function buildSwisstopoWmtsSource(layerName, format = "jpeg") {
    const projection = ol.proj.get("EPSG:2056");

    const matrixIds = SWISSTOPO_RESOLUTIONS.map((_, i) => i);

    const tileGrid = new ol.tilegrid.WMTS({
        origin: SWISSTOPO_TILE_ORIGIN,
        resolutions: SWISSTOPO_RESOLUTIONS,
        matrixIds: matrixIds,
    });

    return new ol.source.WMTS({
        url:
            "https://wmts.geo.admin.ch/1.0.0/" +
            "{Layer}/default/current/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}." +
            format,
        layer: layerName,
        matrixSet: "2056",
        format: "image/" + format,
        projection: projection,
        tileGrid: tileGrid,
        style: "default",
        requestEncoding: "REST",
        wrapX: false,
        crossOrigin: "anonymous",
        dimensions: {},
    });
}

/**
 * Crée un ol.layer.Tile Swisstopo prêt à être ajouté à la carte.
 *
 * @param {String} layerName
 * @param {String} format
 * @returns {ol.layer.Tile}
 */
export function buildSwisstopoTileLayer(layerName, format = "jpeg") {
    return new ol.layer.Tile({
        source: buildSwisstopoWmtsSource(layerName, format),
        extent: SWISSTOPO_EXTENT_2056,
    });
}
