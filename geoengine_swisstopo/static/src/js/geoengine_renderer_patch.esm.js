/** @odoo-module */

/* global ol, console */

/**
 * Patch the GeoengineRenderer to handle multi-SRID projection correctly.
 *
 * The base OCA renderer assumes all geometry data is in EPSG:3857.
 * When geo fields use a different SRID (e.g. 2056 for Swiss LV95),
 * features display at the wrong location.
 *
 * This patch:
 * 1. Registers proj4 projections on first map render
 * 2. Reads/writes geometries with explicit projection options
 * 3. Normalizes Polygon → MultiPolygon when needed
 * 4. Fixes draw/edit to write coordinates in the correct data SRID
 */

import {GeoengineRenderer} from "@base_geoengine/js/views/geoengine/geoengine_renderer/geoengine_renderer.esm";
import {patch} from "@web/core/utils/patch";
import {
    ensureProjectionsRegistered,
    readGeometryWithProjection,
    writeGeometryWithProjection,
} from "@geoengine_swisstopo/js/proj4_setup.esm";
import {
    SWISSTOPO_EXTENT_2056,
    SWISSTOPO_RESOLUTIONS,
    buildSwisstopoTileLayer,
} from "@geoengine_swisstopo/js/swisstopo_raster.esm";

// ---- Geometry normalization utilities ----

const WKB_HEX_RE = /^[0-9a-fA-F]+$/;

function isCoordinatePair(value) {
    return (
        Array.isArray(value) &&
        value.length >= 2 &&
        typeof value[0] === "number" &&
        typeof value[1] === "number"
    );
}

/**
 * Decode a WKB hex string to a GeoJSON object using OpenLayers.
 */
function wkbHexToGeoJSON(hexStr) {
    if (typeof ol === "undefined" || !ol.format || !ol.format.WKB) {
        return null;
    }
    try {
        const wkbFormat = new ol.format.WKB();
        const feature = wkbFormat.readFeature(hexStr);
        const olGeom = feature.getGeometry();
        const gjFormat = new ol.format.GeoJSON();
        return JSON.parse(gjFormat.writeGeometry(olGeom));
    } catch (e) {
        console.warn("geoengine_swisstopo: failed to decode WKB hex", e);
        return null;
    }
}

/**
 * Ensure geometry payload matches the expected type.
 * Wraps Polygon into MultiPolygon when the field expects MultiPolygon.
 */
function normalizeGeometryPayload(rawGeometry, expectedType) {
    if (!rawGeometry || expectedType !== "MultiPolygon") {
        return rawGeometry;
    }

    const wasString = typeof rawGeometry === "string";
    let geometry = rawGeometry;

    if (wasString) {
        if (WKB_HEX_RE.test(rawGeometry)) {
            geometry = wkbHexToGeoJSON(rawGeometry);
            if (!geometry) {
                return rawGeometry;
            }
        } else {
            try {
                geometry = JSON.parse(rawGeometry);
            } catch {
                return rawGeometry;
            }
        }
    }

    if (
        !geometry ||
        typeof geometry !== "object" ||
        !Array.isArray(geometry.coordinates)
    ) {
        return rawGeometry;
    }

    let normalized = geometry;

    if (geometry.type === "Polygon") {
        normalized = {
            ...geometry,
            type: "MultiPolygon",
            coordinates: [geometry.coordinates],
        };
    } else if (
        geometry.type === "MultiPolygon" &&
        Array.isArray(geometry.coordinates[0]) &&
        Array.isArray(geometry.coordinates[0][0]) &&
        isCoordinatePair(geometry.coordinates[0][0])
    ) {
        normalized = {
            ...geometry,
            coordinates: [geometry.coordinates],
        };
    }

    return wasString ? JSON.stringify(normalized) : normalized;
}

// ---- SRID helpers ----

/**
 * Determine the data SRID for a given vector layer configuration.
 *
 * Priority:
 * 1. cfg.geo_field_srid — injected by Python override (if > 0)
 * 2. Field metadata from props.data.fields (works for main model)
 * 3. renderer._dataSrid — the main model's SRID (set in renderMap)
 * 4. Default: 3857
 */
function getLayerSrid(cfg, renderer) {
    // 1. Python-injected SRID (must be > 0 to be valid)
    if (cfg.geo_field_srid && cfg.geo_field_srid !== 3857) {
        return cfg.geo_field_srid;
    }

    // 2. Field metadata from the main model's fields_get
    const fieldName =
        cfg.geo_field_id && cfg.geo_field_id[1] ? cfg.geo_field_id[1] : null;
    if (fieldName) {
        const fieldMeta = renderer.props?.data?.fields?.[fieldName];
        if (fieldMeta?.geo_type?.srid) {
            return fieldMeta.geo_type.srid;
        }
    }

    // 3. Main model's SRID (already resolved in renderMap)
    if (renderer._dataSrid && renderer._dataSrid !== 3857) {
        return renderer._dataSrid;
    }

    // 4. Python-injected SRID (even if 3857)
    if (cfg.geo_field_srid) {
        return cfg.geo_field_srid;
    }

    return 3857;
}

/**
 * Get the SRID of the main model's primary geometry field.
 */
function getMainGeoFieldSrid(renderer) {
    const fieldName = renderer.getGeometryFieldName?.();
    if (fieldName && renderer.props?.data?.fields?.[fieldName]?.geo_type?.srid) {
        return renderer.props.data.fields[fieldName].geo_type.srid;
    }
    return 3857;
}

// ---- Patch ----

patch(GeoengineRenderer.prototype, {
    /**
     * After the map is created, register projections and store the main
     * model's SRID for use by draw/edit operations.
     */
    renderMap() {
        super.renderMap(...arguments);
        if (this.map) {
            ensureProjectionsRegistered();
            this._dataSrid = getMainGeoFieldSrid(this);

            // Si les données sont en EPSG:2056, forcer la vue native
            // pour éviter la reprojection des tuiles Swisstopo
            if (this._dataSrid === 2056) {
                const proj2056 = ol.proj.get("EPSG:2056");
                proj2056.setExtent(SWISSTOPO_EXTENT_2056);

                this.map.setView(
                    new ol.View({
                        projection: proj2056,
                        resolutions: SWISSTOPO_RESOLUTIONS,
                        center: ol.extent.getCenter(SWISSTOPO_EXTENT_2056),
                        zoom: 16,
                        extent: SWISSTOPO_EXTENT_2056,
                    })
                );

                // Add Swisstopo tile layers AFTER the view is in 2056.
                // They can't be created in createBackgroundLayers because
                // the view is still in 3857 at that point.
                this._addSwisstopoRasterLayers();
            }

            this._mapProj = this.map.getView().getProjection();

            // Replace this.format with a projection-aware wrapper
            // that the existing modifyend handler (createEditControl) will use
            const dataSrid = this._dataSrid;
            const mapProj = this._mapProj;
            this.format = {
                readGeometry(geojson) {
                    return readGeometryWithProjection(geojson, dataSrid, mapProj);
                },
                writeGeometry(geometry) {
                    return writeGeometryWithProjection(geometry, dataSrid, mapProj);
                },
            };
        }
    },

    /**
     * Filter out 'swisstopo' rasters from createBackgroundLayers.
     * They will be added later in renderMap after the view is set to EPSG:2056.
     */
    createBackgroundLayers(backgrounds) {
        const nonSwisstopo = backgrounds.filter((bg) => bg.raster_type !== "swisstopo");
        return nonSwisstopo
            .map((background) => {
                switch (background.raster_type) {
                    case "osm": {
                        return new ol.layer.Tile({
                            title: background.name,
                            visible: !background.overlay,
                            type: "base",
                            opacity: background.opacity,
                            source: new ol.source.OSM(),
                        });
                    }
                    case "wmts": {
                        const {source_opt, tilegrid_opt, layer_opt} =
                            this.createOptions(background);
                        this.getUrl(background, source_opt);
                        if (background.format_suffix) {
                            source_opt.format = background.format_suffix;
                        }
                        if (background.request_encoding) {
                            source_opt.requestEncoding = background.request_encoding;
                        }
                        if (background.projection) {
                            source_opt.projection = ol.proj.get(background.projection);
                            if (source_opt.projection) {
                                const projectionExtent =
                                    source_opt.projection.getExtent();
                                tilegrid_opt.origin =
                                    ol.extent.getTopLeft(projectionExtent);
                            }
                        }
                        if (background.resolutions) {
                            tilegrid_opt.resolutions = background.resolutions
                                .split(",")
                                .map(Number);
                            const nbRes = tilegrid_opt.resolutions.length;
                            const matrixIds = new Array(nbRes);
                            for (let i = 0; i < nbRes; i++) {
                                matrixIds[i] = i;
                            }
                            tilegrid_opt.matrixIds = matrixIds;
                        }
                        if (background.max_extent) {
                            const extent = background.max_extent.split(",").map(Number);
                            layer_opt.extent = extent;
                            tilegrid_opt.extent = extent;
                        }
                        if (background.params) {
                            source_opt.dimensions = JSON.parse(background.params);
                        }
                        source_opt.tileGrid = new ol.tilegrid.WMTS(tilegrid_opt);
                        layer_opt.source = new ol.source.WMTS(source_opt);
                        return new ol.layer.Tile(layer_opt);
                    }
                    case "d_wms": {
                        const source_opt_wms = {
                            params: JSON.parse(background.params_wms),
                            serverType: background.server_type,
                        };
                        const urls = background.url.split(",");
                        if (urls.length > 1) {
                            source_opt_wms.urls = urls;
                        } else {
                            source_opt_wms.url = urls[0];
                        }
                        return new ol.layer.Tile({
                            title: background.name,
                            visible: !background.overlay,
                            opacity: background.opacity,
                            source: new ol.source.TileWMS(source_opt_wms),
                        });
                    }
                    default: {
                        return undefined;
                    }
                }
            })
            .filter(Boolean);
    },

    /**
     * Add Swisstopo tile layers from raster store records.
     * Called AFTER the view is switched to EPSG:2056 so that
     * the tile grid and extent are correctly resolved.
     */
    _addSwisstopoRasterLayers() {
        if (this._swisstopoLayersAdded) {
            return;
        }
        this._swisstopoLayersAdded = true;

        const rasters = this.rasterLayersStore?.rastersLayers || [];
        const swisstopoRasters = rasters.filter((r) => r.raster_type === "swisstopo");

        if (swisstopoRasters.length === 0) {
            return;
        }

        const layers = this.map.getLayers();
        for (const raster of swisstopoRasters) {
            const tileLayer = buildSwisstopoTileLayer(
                raster.swisstopo_layer_name || "ch.swisstopo.pixelkarte-farbe",
                "jpeg"
            );
            tileLayer.set("title", raster.name);
            tileLayer.setVisible(raster.isVisible !== false);
            tileLayer.setOpacity(raster.opacity || 1.0);
            // Insert at position 0 (below all other layers)
            layers.insertAt(0, tileLayer);
        }
    },

    /**
     * Read geometry features with the correct data projection.
     * Also normalizes Polygon → MultiPolygon when the field expects it.
     */
    addFeatureToSource(data, cfg, vectorSource) {
        ensureProjectionsRegistered();
        const srid = getLayerSrid(cfg, this);
        const mapProj = this.map.getView().getProjection();

        // Determine expected geo_type for normalization
        const fieldName = cfg.geo_field_id?.[1];
        const expectedGeoType =
            this.props?.data?.fields?.[fieldName]?.geo_type?.geo_type;

        data.forEach((item) => {
            const sourceValues =
                item._values === undefined
                    ? Object.assign({}, item || {})
                    : Object.assign({}, item._values || {});
            const attributes = Object.assign({}, sourceValues);
            this.geometryFields.forEach((geo_field) => delete attributes[geo_field]);

            if (cfg.display_polygon_labels === true && cfg.attribute_field_id) {
                attributes.label = sourceValues[cfg.attribute_field_id[1]];
            } else {
                attributes.label = "";
            }
            attributes.color = cfg.begin_color;

            const rawGeometry = sourceValues[cfg.geo_field_id[1]];
            const geometryValue = normalizeGeometryPayload(
                rawGeometry,
                expectedGeoType
            );

            if (!geometryValue) {
                return;
            }

            try {
                // Explicit projection transform via readGeometry options
                const geometry = readGeometryWithProjection(
                    geometryValue,
                    srid,
                    mapProj
                );
                const feature = new ol.Feature({
                    geometry,
                    attributes,
                    model: cfg.model,
                });
                feature.setId(item.resId);
                vectorSource.addFeature(feature);
            } catch (error) {
                console.warn(
                    "geoengine_swisstopo: skipped invalid geometry for record",
                    item?.resId,
                    error
                );
            }
        });
    },

    /**
     * Override createDrawControl to use projection-aware format
     * when writing newly drawn features.
     */
    createDrawControl() {
        const {element, button} = this.createHtmlControl(
            '<i class="fa fa-pencil"></i>',
            "draw-control ol-unselectable ol-control"
        );
        const self = this;
        button.addEventListener("click", () => {
            this.hidePopup();
            this.addSelectedClassToButton(button);
            this.removeModifyInteraction();
            this.removeSelectInteraction();
            if (this.props.data.editedRecord !== undefined) {
                this.props.onClickDiscard();
            }
            this.startDrawInteraction({
                onDrawStart: () => this.props.onDrawStart(),
                onDrawEnd: (ev, key) => {
                    // Write geometry back in data SRID
                    const value = writeGeometryWithProjection(
                        ev.feature.getGeometry(),
                        self._dataSrid || 3857,
                        self._mapProj || "EPSG:3857"
                    );
                    this.props.createRecord(this.props.data.resModel, key, value);
                },
            });
        });

        const DrawControl = new ol.control.Control({
            element: element,
        });
        this.map.addControl(DrawControl);
    },
});
