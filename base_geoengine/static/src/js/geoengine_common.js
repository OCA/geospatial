/* ---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Vaucher 2015-2017 Camptocamp SA
 * License in __openerp__.py at root level of the module
 * ---------------------------------------------------------
 */
odoo.define('base_geoengine.geoengine_common', function (require) {
    "use strict";

    /* ---------------------------------------------------------
     * Odoo geoengine view
     * ---------------------------------------------------------
     */

    var core = require('web.core');

    var GeoengineMixin = {

        cssLibs: [
            '/base_geoengine/static/lib/ol-3.18.2/ol.css',
            '/base_geoengine/static/lib/ol3-layerswitcher.css',
            '/base_geoengine/static/lib/geostats-1.4.0/geostats.css',
        ],
        jsLibs: [
            '/base_geoengine/static/lib/ol-3.18.2/ol-debug.js',
            '/base_geoengine/static/lib/ol3-layerswitcher.js',
            '/base_geoengine/static/lib/chromajs-0.8.0/chroma.js',
            '/base_geoengine/static/lib/geostats-1.4.0/geostats.js',
        ],

        /**
         * Creates background layers from config
         *
         * @param {Array} layersCfg - the background layers array of config objects
         * @returns {Array}
         */
        createBackgroundLayers: function (layersCfg) {
            var out = [];
            _.each(layersCfg, function (l) {
                // FIXME to be tested
                if (l.is_wmts) {
                    var source_opt = {
                        layer: l.name,
                        matrixSet: l.matrix_set,
                        url: l.url.split(','), // FIXME or maybe "urls"?
                        style: 'default',
                    };
                    var tilegrid_opt = {};
                    var layer_opt = {
                        layer: l.type, // FIXME deprecated?
                    };

                    if (l.format_suffix) {
                        source_opt.format = l.format_suffix;
                    }
                    if (l.request_encoding) {
                        source_opt.requestEncoding = l.request_encoding;
                    }
                    if (l.projection) {
                        source_opt.projection = l.projection;
                    }
                    // FIXME deprecated?
                    // if (l.units) {
                    //     opt.units = l.units;
                    // }
                    if (l.resolutions) {
                        tilegrid_opt.resolutions =
                            l.resolutions.split(',').map(Number);
                    }
                    if (l.max_extent) {
                        var extent = l.max_extent.split(',').map(Number);
                        layer_opt.extent = extent;
                        tilegrid_opt.extent = extent;
                    }
                    // FIXME deprecated?
                    // if (l.server_resolutions) {
                    //     opt.serverResolutions =
                    //         l.server_resolutions.split(',').map(Number);
                    // }
                    if (l.dimensions) {
                        source_opt.dimensions = l.dimensions.split(',');
                    }
                    // FIXME deprecated?
                    // if (l.params) {
                    //     opt.params = JSON.parse(l.params);
                    // }

                    source_opt.tileGrid = new ol.tilegrid.WMTS(tilegrid_opt);
                    layer_opt.source = new ol.source.WMTS(source_opt);

                    out.push(new ol.layer.Tile(layer_opt));
                } else {
                    switch (l.raster_type) {
                        case "osm":
                            out.push(
                                new ol.layer.Tile({
                                    title: l.name,
                                    visible: !l.overlay,
                                    type: 'base',
                                    source: new ol.source.OSM()
                                })
                            );
                            break;
                    }
                }
            });
            return out;
        },
    };

    return {
        GeoengineMixin: GeoengineMixin,
    };
});
