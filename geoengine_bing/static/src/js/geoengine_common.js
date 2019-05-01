odoo.define('geoengine_bing.BackgroundLayers', function (require) {
    "use strict";

    var BackgroundLayers = require('base_geoengine.BackgroundLayers');

    BackgroundLayers.include({
        handleCustomLayers: function (layer) {
            var out = this._super.apply(this, arguments);
            if (layer.is_bing) {
                var layer_opt = {
                    title: layer.name,
                    visible: !layer.overlay,
                    type: 'base',
                    source: new ol.source.BingMaps({
                        layer: layer.name,
                        key: layer.bing_key,
                        imagerySet: layer.bing_imagery_set,
                    }),
                };
                out.push(new ol.layer.Tile(layer_opt));
            }
            return out;
        },
    });
});
