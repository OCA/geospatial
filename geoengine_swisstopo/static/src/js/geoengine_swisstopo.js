/**
 * Available resolutions as defined in
 * https://api3.geo.admin.ch/services/sdiservices.html#wmts.
 * @const {!Array.<number>}
 */
var RESOLUTIONS = [
  4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250,
  1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5,
  0.25, 0.1
];

var BASE_URL = 'https://wmts{0-9}.geo.admin.ch/1.0.0/{Layer}/default/{Time}/21781/{TileMatrix}/{TileRow}/{TileCol}.{format}';

var ATTRIBUTIONS = '<a target="_blank" href="https://www.swisstopo.admin.ch">swisstopo</a>';

/**
 * Extents of Swiss projections. (EPSG:21781)
 */
var EXTENT = [420000, 30000, 900000, 350000];

var PROJECTION_CODE = "EPSG:21781";

var init_EPSG_21781 = function (self) {
    // Adding proj4
    self.jsLibs.push(
        '/geoengine_swisstopo/static/lib/proj4.js'
    );
};

var define_EPSG_21781 = function () {
    // add swiss projection to allow conversions
    if (!ol.proj.get(PROJECTION_CODE)) {
        proj4.defs('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 ' +
            '+lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel ' +
            '+towgs84=674.4,15.1,405.3,0,0,0,0 +units=m +no_defs');
    }
};


odoo.define('geoengine_swisstopo.projection_EPSG_21781', function (require) {
    "use strict";

    var GeoengineWidgets = require('base_geoengine.geoengine_widgets');
    var GeoengineView = require('base_geoengine.GeoengineView');

    GeoengineWidgets.FieldGeoEngineEditMap.include({
        init: function (parent) {
            this._super.apply(this, arguments);
            init_EPSG_21781(this);
        },
        _render: function (parent) {
            define_EPSG_21781();
            this._super.apply(this, arguments);
        },

    });
    GeoengineView.include({
        init: function (parent) {
            this._super.apply(this, arguments);
            init_EPSG_21781(this);
        },
        _render: function (parent) {
            define_EPSG_21781();
            this._super.apply(this, arguments);
        },

    });
});


odoo.define('geoengine_swisstopo.BackgroundLayers', function (require) {
    "use strict";

    var BackgroundLayers = require('base_geoengine.BackgroundLayers');

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
            if (l.raster_type == 'swisstopo') {
                var format = l.format_suffix || 'jpeg';
                var layer = l.layername || 'ch.swisstopo.pixelkarte-farbe';

                var url = BASE_URL.replace('{format}', format);
                var projection = ol.proj.get(PROJECTION_CODE);
                var source = new ol.source.WMTS({
                    attributions: [
                        new ol.Attribution({
                            html: ATTRIBUTIONS,
                        })
                    ],
                    url: url,
                    dimensions: {
                        'Time': l.time || 'current',
                    },
                    projection: projection,
                    requestEncoding: 'REST',
                    layer: layer,
                    style: 'default',
                    matrixSet: '21781',
                    format: 'image/' + format,
                    tileGrid: this.createTileGrid(),
                    crossOrigin: 'anonymous',
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
