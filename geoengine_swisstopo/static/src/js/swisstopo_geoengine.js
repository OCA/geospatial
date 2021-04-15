/**
 * Available resolutions as defined in
 * https://api3.geo.admin.ch/services/sdiservices.html#wmts.
 * @const {!Array.<number>}
 */
var RESOLUTIONS = [
    4000,
    3750,
    3500,
    3250,
    3000,
    2750,
    2500,
    2250,
    2000,
    1750,
    1500,
    1250,
    1000,
    750,
    650,
    500,
    250,
    100,
    50,
    20,
    10,
    5,
    2.5,
    2,
    1.5,
    1,
    0.5,
    0.25,
    0.1,
];

var BASE_URL =
    "https://wmts{0-9}.geo.admin.ch/1.0.0/{Layer}/default/{Time}/21781/{TileMatrix}/{TileRow}/{TileCol}.{format}";

var ATTRIBUTIONS =
    '<a target="_blank" href="https://www.swisstopo.admin.ch">swisstopo</a>';

/**
 * Extents of Swiss projections. (EPSG:21781)
 */
var EXTENT = [420000, 30000, 900000, 350000];

odoo.define("geoengine_swisstopo.BackgroundLayers", function(require) {
    "use strict";

    var BackgroundLayers = require("base_geoengine.BackgroundLayers");

    BackgroundLayers.include({
        createTileGrid: function() {
            return new ol.tilegrid.WMTS({
                extent: EXTENT,
                resolutions: RESOLUTIONS,
                matrixIds: RESOLUTIONS.map(function(item, index) {
                    return String(index);
                }),
            });
        },

        handleCustomLayers: function(l) {
            var out = this._super.apply(this, arguments);
            if (l.raster_type == "swisstopo") {
                var format = l.format_suffix || "jpeg";
                var layer = l.layername || "ch.swisstopo.pixelkarte-farbe";

                var url = BASE_URL.replace("{format}", format);
                var source = new ol.source.WMTS({
                    attributions: [
                        new ol.Attribution({
                            html: ATTRIBUTIONS,
                        }),
                    ],
                    url: url,
                    dimensions: {
                        Time: l.time || "current",
                    },
                    projection: "EPSG:21781",
                    requestEncoding: "REST",
                    layer: layer,
                    style: "default",
                    matrixSet: "21781",
                    format: "image/" + format,
                    tileGrid: this.createTileGrid(),
                    crossOrigin: "anonymous",
                });
                out.push(
                    new ol.layer.Tile({
                        title: l.name,
                        visible: !l.overlay,
                        type: "base",
                        source: source,
                    })
                );
            }
            return out;
        },
    });
});
