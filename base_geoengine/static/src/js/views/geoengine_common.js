/*---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Vaucher 2015-2016 Camptocamp SA
 * License in __openerp__.py at root level of the module
 *---------------------------------------------------------
*/
odoo.define('base_geoengine.geoengine_common', function (require) {

/*---------------------------------------------------------
 * Odoo geoengine view
 *---------------------------------------------------------*/

var core = require('web.core');
var time = require('web.time');
var View = require('web.View');


var _lt = core._lt;
var QWeb = core.qweb;

var GeoengineMixin = {
    /**
     * Method: createBackgroundLayers
     * creates background layers from config
     *
     * Parameters:
     * bg_layers - {Array} the background layers array of config objects
     */
    createBackgroundLayers: function(bg_layers) {
        var out = [];
        _.each(bg_layers, function(l) {
            if (l.is_wmts) {
                // http://map.lausanne.ch/tiles/1.0.0/WMTSCapabilities.xml
                var opt = {
                    name: l.name,
                    url: l.url.split(','),
                    layer: l.type,
                    style: 'default',
                    matrixSet: l.matrix_set,
                    attribution: "<a href='http://www.camptocamp.com' style='color:orange;font-weight:bold;background-color:#FFFFFF' target='_blank'>Powered by Camptocamp</a>\
                              data <a href='http://map.lausanne.ch/' target='_blank'>&copy; Lausanne</a>"
                }

                if (l.format_suffix) { opt.formatSuffix = l.format_suffix; }
                if (l.request_encoding) { opt.requestEncoding = l.request_encoding; }
                if (l.projection) { opt.projection = l.projection; }
                if (l.units) { opt.units = l.units; }
                if (l.resolutions) { opt.resolutions = l.resolutions.split(',').map(Number); }
                if (l.max_extent) { opt.maxExtent = OpenLayers.Bounds.fromString(l.max_extent); }
                if (l.server_resolutions) { opt.serverResolutions = l.server_resolutions.split(',').map(Number); }
                if (l.dimensions) { opt.dimensions = l.dimensions.split(','); }
                if (l.params) { opt.params = JSON.parse(l.params); }

                out.push(new OpenLayers.Layer.WMTS(opt));
            } else {
                switch (l.raster_type) {
                    case "osm":
                        out.push(
                            new OpenLayers.Layer.OSM(
                                l.name,
                                'http://tile.openstreetmap.org/${z}/${x}/${y}.png', {
                                    attribution: "<a href='http://www.camptocamp.com' style='color:orange;font-weight:bold;background-color:#FFFFFF' target='_blank'>Powered by Camptocamp</a>\
                                                  using <a href='http://www.openstreetmap.org/' target='_blank'>OpenStreetMap</a> raster",
                                    buffer: 1,
                                    transitionEffect: 'resize'
                                }));
                        break;
                    case "mapbox":
                        out.push(
                            new OpenLayers.Layer.XYZ(l.name, [
                                "http://a.tiles.mapbox.com/v3/" + l.mapbox_id + "/${z}/${x}/${y}.png",
                                "http://b.tiles.mapbox.com/v3/" + l.mapbox_id + "/${z}/${x}/${y}.png",
                                "http://c.tiles.mapbox.com/v3/" + l.mapbox_id + "/${z}/${x}/${y}.png",
                                "http://d.tiles.mapbox.com/v3/" + l.mapbox_id + "/${z}/${x}/${y}.png"
                            ], {
                                sphericalMercator: true,
                                wrapDateLine: true,
                                numZoomLevels: 17,
                                attribution: "<a href='http://www.camptocamp.com' style='color:orange;font-weight:bold;background-color:#FFFFFF' target='_blank'>Powered by Camptocamp</a>\
                                          using <a href='http://www.openstreetmap.org/' target='_blank'>OpenStreetMap</a> raster"
                            })
                        );
                        break;
                    case "google":
                        var glayers = {
                            "G_PHYSICAL_MAP": google.maps.MapTypeId.TERRAIN,
                            "G_HYBRID_MAP": google.maps.MapTypeId.HYBRID,
                            "G_SATELLITE_MAP": google.maps.MapTypeId.SATELLITE
                        };
                        out.push(
                            new OpenLayers.Layer.Google(
                                l.name,
                                {type: glayers[l.google_type],
                                attribution: "<a href='http://www.camptocamp.com' style='position:relative;left:-470px;color:orange;font-weight:bold;background-color:#FFFFFF' target='_blank'>Powered by Camptocamp</a>"}
                            ));
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

OpenLayers.Control.ToolPanel = OpenLayers.Class(OpenLayers.Control.Panel, {
    initialize: function(options) {
        OpenLayers.Control.Panel.prototype.initialize.apply(this, [options]);

        var style = new OpenLayers.Style();
        style.addRules([
            new OpenLayers.Rule({symbolizer: {
                "Point": {
                    pointRadius: 4,
                    graphicName: "square",
                    fillColor: "white",
                    fillOpacity: 1,
                    strokeWidth: 1,
                    strokeOpacity: 1,
                    strokeColor: "#000000"
                },
                "Line": {
                    strokeWidth: 3,
                    strokeOpacity: 1,
                    strokeColor: "#000000",
                    strokeDashstyle: "dash"
                },
                "Polygon": {
                    strokeWidth: 2,
                    strokeOpacity: 1,
                    strokeColor: "#000000",
                    fillColor: "white",
                    fillOpacity: 0.3
                }
            }})]);

        var styleMap = new OpenLayers.StyleMap({"default": style});

        this.displayClass = 'olControlEditingToolbar';
        var navCtrl = new OpenLayers.Control.Navigation();
        this.defaultControl = navCtrl;
        this.addControls([
            new OpenLayers.Control.Measure(
                OpenLayers.Handler.Polygon, {
                    persist: true,
                    immediate: true,
                    displayClass: "olControlDrawFeaturePolygon",
                    title: "Measure an area",
                    handlerOptions: {
                        layerOptions: {styleMap: styleMap}
                    },
                    eventListeners: {
                        "measure": OpenLayers.Function.bind(this.handleFullMeasurements, this),
                        "measurepartial": OpenLayers.Function.bind(this.handlePartialMeasurements, this),
                        "deactivate": function() {
                            document.getElementById('map_measurementbox').style.display = 'none';
                        }
                    }
                }),
            new OpenLayers.Control.Measure(
                OpenLayers.Handler.Path, {
                    persist: true,
                    immediate: true,
                    displayClass: "olControlDrawFeaturePath",
                    title: "Measure a distance",
                    handlerOptions: {
                        layerOptions: {styleMap: styleMap}
                    },
                    eventListeners: {
                        "measure": OpenLayers.Function.bind(this.handleFullMeasurements, this),
                        "measurepartial": OpenLayers.Function.bind(this.handlePartialMeasurements, this),
                        "deactivate": function() {
                            document.getElementById('map_measurementbox').style.display = 'none';
                        }
                    }
                }),
            navCtrl
        ]);
    },
    handlePartialMeasurements: function(event) {
        this.handleMeasurements(event);
    },
    handleFullMeasurements: function(event) {
        this.handleMeasurements(event);
    },
    handleMeasurements: function(event) {
        var geometry = event.geometry;
        var units = event.units;
        var order = event.order;
        var measure = event.measure;
        var element = document.getElementById('map_measurementbox');
        var out = "";
        if (order == 1) {
            out += '<span style="font-weight: bold">measure</span>: ' + measure.toFixed(1) + " " + units;
        } else {
            out += '<span style="font-weight: bold">measure</span>: ' + measure.toFixed(1) + " square " + units;
        }
        element.innerHTML = out;
        element.style.display = 'block';
    },
    CLASS_NAME: "OpenLayers.Control.ToolPanel"

});
