odoo.define('swisstopo_geoengine.BackgroundLayers', function (require) {
    "use strict";

    var BackgroundLayers = require('base_geoengine.BackgroundLayers');

    BackgroundLayers.include({
        handleCustomLayers: function(l) {
            var out = this._super.apply(this, arguments);
            if (l.raster_type == 'swisstopo') {
                var urls = [];
                ['10', '11', '12', '13', '14'].map(function(i) {
                    var url = 'https://wmts{i}.geo.admin.ch/1.0.0/{layer}/default/{time}/{projection}/{z}/{x}/{y}.{format}';
                    url = url.replace('{i}', i);
                    url = url.replace('{layer}', l.layername || 'ch.swisstopo.pixelkarte-farbe');
                    url = url.replace('{time}', l.time || 'current');
                    url = url.replace('{projection}', l.projection || '3857');
                    url = url.replace('{format}', l.format_suffix || 'jpeg');
                    urls.push(url);
                });
                var source = new ol.source.XYZ({
                    attributions: [
                        new ol.Attribution({
                            html: '<a target="_blank" href="https://www.swisstopo.admin.ch">swisstopo</a>'
                        })
                    ],
                    urls: urls,
                    maxZoom: 17
                });
                out.push(
                    new ol.layer.Tile({
                        title: l.name,
                        visible: !l.overlay,
                        type: 'base',
                        source: source
                    })
                );
            }
            return out;
        }
    });
});
