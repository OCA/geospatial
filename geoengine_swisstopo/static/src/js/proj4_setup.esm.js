/** @odoo-module */

/* global proj4, ol */

/**
 * proj4 + OpenLayers projection registration.
 *
 * OpenLayers only knows EPSG:3857 and EPSG:4326 out of the box.
 * For any other SRID we must register via proj4js, then call
 * ol.proj.proj4.register(proj4).
 */

let _registered = false;

/**
 * Register commonly used projections with proj4 and OpenLayers.
 * Safe to call multiple times — only runs once.
 */
export function ensureProjectionsRegistered() {
    if (_registered) {
        return;
    }
    if (typeof proj4 === "undefined") {
        console.error(
            "geoengine_swisstopo: proj4 global not found — projection transforms will NOT work"
        );
        return;
    }
    if (typeof ol === "undefined") {
        console.error(
            "geoengine_swisstopo: ol global not found — projection transforms will NOT work"
        );
        return;
    }

    // ---- Swiss projections ----

    // EPSG:2056 — CH1903+ / LV95 (current Swiss standard)
    proj4.defs(
        "EPSG:2056",
        "+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 " +
            "+k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel " +
            "+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs"
    );

    // EPSG:21781 — CH1903 / LV03 (legacy Swiss, still widely used)
    proj4.defs(
        "EPSG:21781",
        "+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 " +
            "+k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel " +
            "+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs"
    );

    // ---- Common European UTM zones ----
    proj4.defs(
        "EPSG:32632",
        "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs +type=crs"
    );
    proj4.defs(
        "EPSG:32631",
        "+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs +type=crs"
    );

    // Register all proj4 definitions with OpenLayers
    ol.proj.proj4.register(proj4);

    _registered = true;
}

/**
 * Read a GeoJSON geometry and transform it from data SRID to map projection.
 *
 * Uses explicit opt_options on readGeometry() to guarantee the transform
 * happens (rather than relying on constructor defaults which may not propagate).
 *
 * @param {string|Object} geojson — GeoJSON geometry (string or parsed object)
 * @param {number|string} srid — data SRID (e.g. 2056)
 * @param {ol.proj.Projection|string} mapProjection — target projection (e.g. EPSG:3857)
 * @returns {ol.geom.Geometry}
 */
export function readGeometryWithProjection(geojson, srid, mapProjection) {
    ensureProjectionsRegistered();
    const dataProj = "EPSG:" + srid;
    return new ol.format.GeoJSON().readGeometry(geojson, {
        dataProjection: dataProj,
        featureProjection: mapProjection,
    });
}

/**
 * Write a geometry from map projection back to data SRID.
 *
 * @param {ol.geom.Geometry} geometry — geometry in map projection
 * @param {number|string} srid — target data SRID
 * @param {ol.proj.Projection|string} mapProjection — source projection
 * @returns {String} GeoJSON string
 */
export function writeGeometryWithProjection(geometry, srid, mapProjection) {
    ensureProjectionsRegistered();
    const dataProj = "EPSG:" + srid;
    return new ol.format.GeoJSON().writeGeometry(geometry, {
        dataProjection: dataProj,
        featureProjection: mapProjection,
    });
}
