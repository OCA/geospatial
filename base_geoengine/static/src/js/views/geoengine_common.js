/*---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Vaucher 2015-2017 Camptocamp SA
 * License in __openerp__.py at root level of the module
 *---------------------------------------------------------
*/
odoo.define('base_geoengine.geoengine_common', function (require) {

/*---------------------------------------------------------
 * Odoo geoengine view
 *---------------------------------------------------------*/

var core = require('web.core');


var GeoengineMixin = {

    /**
     * Method: createBackgroundLayers
     * creates background layers from config
     *
     * Parameters:
     * layersCfg - {Array} the background layers array of config objects
     */
    createBackgroundLayers: function(layersCfg) {
        var out = [];
        _.each(layersCfg, function(l) {
            if (l.is_wmts) {
                var opt = {
                    name: l.name,
                    url: l.url.split(','),
                    layer: l.type,
                    style: 'default',
                    matrixSet: l.matrix_set,
                    attribution: "<a href='http://www.camptocamp.com' style='color:orange;font-weight:bold;background-color:#FFFFFF' target='_blank'>Powered by Camptocamp</a>"
                };

                if (l.format_suffix) { opt.formatSuffix = l.format_suffix; }
                if (l.request_encoding) { opt.requestEncoding = l.request_encoding; }
                if (l.projection) { opt.projection = l.projection; }
                if (l.units) { opt.units = l.units; }
                if (l.resolutions) { opt.resolutions = l.resolutions.split(',').map(Number); }
                if (l.max_extent) { opt.maxExtent = OpenLayers.Bounds.fromString(l.max_extent); }
                if (l.server_resolutions) { opt.serverResolutions = l.server_resolutions.split(',').map(Number); }
                if (l.dimensions) { opt.dimensions = l.dimensions.split(','); }
                if (l.params) { opt.params = JSON.parse(l.params); }

                // FIXME use OL3 syntax here instead of OL2
                out.push(new OpenLayers.Layer.WMTS(opt));
            } else {
                switch (l.raster_type) {
                    case "osm":
                        out.push(
                            new ol.layer.Tile({
                                title: l.name,
                                visible: !l.overlay,
                                type:'base',
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
    // mixins
    GeoengineMixin: GeoengineMixin,
};
});
