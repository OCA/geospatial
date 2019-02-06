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
            '/base_geoengine/static/lib/ol-3.20.1/ol.css',
            '/base_geoengine/static/lib/ol3-layerswitcher.css',
            '/base_geoengine/static/lib/geostats-1.4.0/geostats.css',
        ],
        jsLibs: [
            '/base_geoengine/static/lib/ol-3.20.1/ol-debug.js',
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
                if (l.is_wmts) {
                    var source_opt = {
                        layer: l.name,
                        matrixSet: l.matrix_set,
                        style: 'default',
                    };
                    var tilegrid_opt = {};
                    var layer_opt = {
                        title: l.name,
                        visible: !l.overlay,
                        type: 'base',
                    };

                    var urls = l.url.split(',');
                    if (urls.length > 1) {
                        source_opt.urls = urls;
                    } else {
                        source_opt.url = urls[0];
                    }

                    if (l.format_suffix) {
                        source_opt.format = l.format_suffix;
                    }
                    if (l.request_encoding) {
                        source_opt.requestEncoding = l.request_encoding;
                    }
                    if (l.projection) {
                        source_opt.projection = ol.proj.get(l.projection);
                        // FIXME if the projection definition is not available...
                        if (source_opt.projection) {
                            var projectionExtent =
                                source_opt.projection.getExtent();
                            tilegrid_opt.origin =
                                ol.extent.getTopLeft(projectionExtent);
                        }
                    }
                    // FIXME deprecated?
                    // if (l.units) {
                    //     opt.units = l.units;
                    // }
                    if (l.resolutions) {
                        tilegrid_opt.resolutions =
                            l.resolutions.split(',').map(Number);
                        var nbRes = tilegrid_opt.resolutions.length;
                        var matrixIds = new Array(nbRes);
                        for (var i = 0; i < nbRes; i++) {
                            matrixIds[i] = i;
                        }
                        tilegrid_opt.matrixIds = matrixIds;
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
                    if (l.params) {
                        // FIXME still used?
                        //source_opt.dimensions = l.dimensions.split(',');
                        source_opt.dimensions = JSON.parse(l.params);
                    }

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
