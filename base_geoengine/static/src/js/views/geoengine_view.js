/*---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Vaucher 2015-2016 Camptocamp SA
 * License in __openerp__.py at root level of the module
 *---------------------------------------------------------
*/
odoo.define('base_geoengine.GeoengineView', function (require) {

/*---------------------------------------------------------
 * Odoo geoengine view
 *---------------------------------------------------------*/

var core = require('web.core');
var time = require('web.time');
var View = require('web.View');

var geoengine_common = require('base_geoengine.geoengine_common');

var _lt = core._lt;
var QWeb = core.qweb;

//var map, layer, vectorLayers = [];
//TODO: remove this DEBUG
var map = null;
var layer = null;
/* CONSTANTS */
var DEFAULT_BEGIN_COLOR = "#FFFFFF";
var DEFAULT_END_COLOR = "#000000";
var DEFAULT_MIN_SIZE = 5; // for prop symbols only
var DEFAULT_MAX_SIZE = 15; // for prop symbols only
var DEFAULT_NUM_CLASSES = 5; // for choroplets only
var STYLE_DEFAULT = OpenLayers.Util.applyDefaults({
        fillColor: DEFAULT_BEGIN_COLOR,
        fillOpacity: 0.8,
        strokeColor: "#333333",
        strokeOpacity: 0.8,
        cursor: "pointer",
        strokeWidth: 1
    }, OpenLayers.Feature.Vector.style['default']);
var STYLE_SELECT = {
    fillColor: "#ffcc66",
    strokeColor: "#ff9933"
};

/**
 * Method: formatHTML
 * formats attributes into a string
 *
 * Parameters:
 * a - {Object}
 */
var formatHTML = function(a, fields) {
    var str = [];
    var oid = '';
    for (var key in a) {
        if (a.hasOwnProperty(key)) {
            var val = a[key];
            if (val == false) {
                continue;
            }
            var span = '';
            if (fields.hasOwnProperty(key)) {
                var field = fields[key];
                var label = field.string;
                if (field.type == 'selection') {
                    // get display value of selection option
                    for (var option in field.selection) {
                        if (field.selection[option][0] == val) {
                            val = field.selection[option][1];
                            break;
                        }
                    }
                }
                if (val instanceof Array) {
                    str.push('<span style="font-weight: bold">' + label + '</span>: ' +val[1]);
                } else {
                    span = '<span style="font-weight: bold">' + label + '</span>: ' +val;
                     if (key == 'id') {
                        oid = span;
                    } else {
                        str.push(span);
                    }
                }
            }
        }
    }
    str.unshift(oid);
    return str.join('<br />');
};

var GeoengineView = View.extend(geoengine_common.GeoengineMixin, {
    template: "GeoengineView",
    display_name: _lt('Geoengine'),
    icon: 'fa-map-o',

    init: function(parent, dataset, view_id, options) {
        this._super(parent);
        this.set_default_options(options);
        this.view_manager = parent;
        this.dataset = dataset;
        this.model = this.dataset.model;
        this.view_id = view_id;
        this.view_type = 'geoengine'
        this.geometry_columns = {};
        this.vectorLayers = [];

        // use {selectedFeatures:[]} as a hack to simulate a vector layer
        // with no feature selected
        this.selectFeatureControls = [
            new OpenLayers.Control.SelectFeature(
            {selectedFeatures:[]}, {hover: true, highlightOnly: true}),
            new OpenLayers.Control.SelectFeature(
                {selectedFeatures:[]}, {})
        ];
        this.selectFeatureControls[0].handlers.feature.stopDown = false;
        this.selectFeatureControls[1].handlers.feature.stopDown = false;
    },
    load_view: function(context) {
        var self = this;
        var view_loaded_def;
        if (this.embedded_view) {
            view_loaded_def = $.Deferred();
            $.async_when().done(function() {
                view_loaded_def.resolve(self.embedded_view);
            });
        } else {
            if (! this.view_type)
                console.warn("view_type is not defined", this);
            view_loaded_def = this.dataset._model.fields_view_get({
                "view_id": this.view_id,
                "view_type": this.view_type,
                "context": this.dataset.get_context(),
            });
        }
        return this.alive(view_loaded_def).then(function(r) {
            self.fields_view = r;
            var data = r.geoengine_layers;
            self.projection = data.projection;
            self.restricted_extent = data.restricted_extent;
            self.default_extent = data.default_extent;
            return $.when(self.view_loading(r)).then(function() {
                self.trigger('view_loaded', r);
            });
        });
    },

    do_search: function (domain, context, _group_by) {
        this._do_search(domain, context, _group_by);
    },
    _do_search: function(domain, context, _group_by) {
        var self = this;
        self.dataset.read_slice(_.keys(self.fields_view.fields), {'domain':domain}).then(this.do_load_vector_data);
    },

    createMultiSymbolStyle: function(symbols) {
        var self = this;
        options = {};
        rules = [];
        for (i in symbols) {

            new_rule = new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: OpenLayers.Filter.Comparison.EQUAL_TO,
                    property: symbols[i].fieldname,
                    value: symbols[i].value
                }),
                symbolizer: {
                    externalGraphic: symbols[i].img
                }
            });
            rules.push(new_rule);
        }
        rules.push(
            new OpenLayers.Rule({
                elseFilter: true,
                symbolizer: {
                    externalGraphic: "base_geoengine/static/img/map-marker.png"
                }
            })
        )

        style = new OpenLayers.Style(
            // base options
            {
                graphicWidth: 24,
                graphicHeight: 24,
            },
            {
                rules: rules
            }
        );
        return style;
    },

    /**
     * Method: createVectorLayer
     *
     * Parameters:
     * cfg - {Object} config object specific to the vector layer
     * data - {Array(features)}
     */
    createVectorLayer: function(cfg, data) {
        var self = this;
        var features = [];
        var geostat = null;
        var geojson = new OpenLayers.Format.GeoJSON();
        var vl = new OpenLayers.Layer.Vector(
            cfg.name,
            {
                styleMap: new OpenLayers.StyleMap({
                    'default': OpenLayers.Util.applyDefaults({
                        fillColor: cfg.begin_color
                    }, STYLE_DEFAULT),
                    'select': STYLE_SELECT
                }),
                rendererOptions: {
                    zIndexing: true
                },
                eventListeners: {
                    "featureselected": function(event) {
                        $("#map_info").html(formatHTML(event.feature.attributes, self.fields_view.fields));
                        $("#map_infobox").off().click(function() {
                            self.open_record(event.feature);
                        });
                        $("#map_infobox").show();

                    },
                    "featureunselected": function() {
                        $("#map_infobox").hide();
                    }
                }
            }
        );
        if (data.length == 0)
            return vl
        _.each(data, function(item) {
            attributes = _.clone(item);
            _.each(_.keys(self.geometry_columns), function(item) {
                delete attributes[item];
            });
            features.push(new OpenLayers.Feature.Vector(
                geojson.parseGeometry(
                    OpenLayers.Format.JSON.prototype.read.call(self, item[cfg.geo_field_id[1]])),
                    attributes));
        });
        var indicator = cfg.attribute_field_id[1];
        switch (cfg.geo_repr) {
            case "basic":
                if (!cfg.symbols) {
                    break;
                }
                if (cfg.symbols.length > 0) {
                    style = this.createMultiSymbolStyle(cfg.symbols);
                    vl.styleMap = new OpenLayers.StyleMap({
                        'default': style,
                    });
                }
                break;
            case "colored":
                var begin_color = new mapfish.ColorRgb();
                begin_color.setFromHex(cfg.begin_color || DEFAULT_BEGIN_COLOR);
                var end_color = new mapfish.ColorRgb();
                end_color.setFromHex(cfg.end_color || DEFAULT_END_COLOR);
                switch (cfg.classification) {
                    case "unique":
                        vl.styleMap = this.getUniqueValuesStyleMap(cfg, features);
                        break;
                    case "quantile":
                        geostat = new mapfish.GeoStat.Choropleth(map, {
                            method: mapfish.GeoStat.Distribution.CLASSIFY_BY_QUANTILS,
                            numClasses: cfg.nb_class || DEFAULT_NUM_CLASSES,
                            colors: [ begin_color, end_color ],
                            layer: vl,
                            indicator: indicator,
                            featureSelection: false
                        });
                        break;
                    case "interval":
                        geostat = new mapfish.GeoStat.Choropleth(map, {
                            method: mapfish.GeoStat.Distribution.CLASSIFY_BY_EQUAL_INTERVALS,
                            numClasses: cfg.nb_class || DEFAULT_NUM_CLASSES,
                            colors: [ begin_color, end_color ],
                            layer: vl,
                            indicator: indicator,
                            featureSelection: false
                        });
                        break;
                }
                break;
            case "proportion":
                geostat = new mapfish.GeoStat.ProportionalSymbol(map, {
                    layer: vl,
                    indicator: indicator,
                    //TODO: this should not be hardcoded!
                    minSize: cfg.min_size || DEFAULT_MIN_SIZE,
                    maxSize: cfg.max_size || DEFAULT_MAX_SIZE,
                    featureSelection: false
                });
                break;
        }
        vl.addFeatures(features);
        if (geostat instanceof mapfish.GeoStat) {
            geostat.setClassification();
            geostat.applyClassification();
        }
        return vl;
    },

    getUniqueValuesStyleMap: function(cfg, features) {
        if (jQuery.isEmptyObject(features)) {
            return;
        }
        var l = features.length, f = features[0];
        var v = cfg.attribute_field_id[1];

        // get the number of unique values
        var distinct = {};
        var i = 0;
        do {
            f = features[i];
            i += 1;
        } while (!f.attributes.hasOwnProperty(v));
        // ok, we've found a feature whose attribute is present
        distinct[f.attributes[v].toString()] = null;
        var nb = 1;
        while(l-- && l>=i) {
            f = features[l];
            if (!distinct.hasOwnProperty(f.attributes[v])) {
                distinct[f.attributes[v]] = null;
                nb += 1;
            }
        }
        // define the nb different colors
        var colors = utils.color.generateDistinctColors(nb);
        // associate colors with values
        l = 0;
        for (var key in distinct) {
            if (distinct.hasOwnProperty(key)) {
                distinct[key] = colors[l];
                l += 1;
            }
        }
        // display them
        return new OpenLayers.StyleMap({
            'default': new OpenLayers.Style(
                OpenLayers.Util.applyDefaults({
                    fillColor: "${color}"
                }, STYLE_DEFAULT),
                {
                    context: {
                        color: function(f) {
                            return (f.attributes.hasOwnProperty(v) && distinct.hasOwnProperty(f.attributes[v])) ?
                                '#'+distinct[f.attributes[v]] : "#ffffff";
                        }
                    }
                }),
            'select': STYLE_SELECT
        });
    },

    /**
        * Method: createVectorLayers
        * creates vector layers from config and populates them with features
        *
        * Parameters:
        * data - {Array} the vector data to be added on the vector layer
        */
    createVectorLayers: function(data) {
        var self = this;
        var out = [];
        _.each(this.fields_view.geoengine_layers.actives, function(item) {
            out.push(self.createVectorLayer(item, data));
        });
        return out;
    },

    do_load_vector_data: function(data) {
        if (!this.map) {
            return;
        }
        var self = this;
        _.each(this.selectFeatureControls, function(ctrl) {
            ctrl.deactivate();
            // setLayer a fake layer to avoid js error on unselectAll
            // use {selectedFeatures:[]} as a hack to simulate a vector
            // layer with no feature selected
            ctrl.setLayer({selectedFeatures:[]});
        });
        _.each(this.vectorLayers, function(vlayer) {
            vlayer.destroy();
        });

        this.vectorLayers = this.createVectorLayers(data);
        this.map.addLayers(this.vectorLayers);
        _.each(this.selectFeatureControls, function(ctrl) {
            ctrl.setLayer(self.vectorLayers);
            ctrl.activate();
        });
        _.each(this.vectorLayers, function(vlayer) {
            // keep only one vector layer active at startup
            if (vlayer != self.vectorLayers[0]) {
                vlayer.setVisibility(false);
            }
        });

        // zoom to data extent
        var data_extent = this.vectorLayers[0].getDataExtent();
        if (data_extent) {
            var bbox = data_extent.scale(1.1);
            if (bbox.getWidth() * bbox.getHeight() !== 0) {
                this.map.zoomToExtent(bbox);
            } else {
                this.map.setCenter(bbox.getCenterLonLat(), 15);
            }
            var ids = [];
            // Javascript expert please improve this code
            for (var i=0, len=data.length; i<len; ++i) {
                ids.push(data[i]['id']);
            }
            self.dataset.ids = ids;
        }
    },

    view_loading: function(fv) {
        console.log("GeoengineView.on_loaded: function(fv): arguments=");
        console.log(fv);
        var self = this;
        this.fields_view = fv;
        _.each(fv.geoengine_layers.actives, function(item) {
            self.geometry_columns[item.geo_field_id[1]] = true;
        });
        return $.when();
    },

    render_map: function() {
        //TODO: copy this mapbox dark theme in the addons
        if (_.isUndefined(this.map)){
            OpenLayers.ImgPath = "//dr0duaxde13i9.cloudfront.net/theme/dark/";
            this.map = new OpenLayers.Map("the_map", {
                layers: this.createBackgroundLayers(this.fields_view.geoengine_layers.backgrounds),
                displayProjection: new OpenLayers.Projection("EPSG:4326"), // Fred should manage projection here
                theme: null,
                controls: [
                    new OpenLayers.Control.KeyboardDefaults(),
                    new OpenLayers.Control.ZoomBox(),
                    new OpenLayers.Control.Attribution(),
                    new OpenLayers.Control.LayerSwitcher({roundedCornerColor: 'black'}),
                    new OpenLayers.Control.PanZoomBar(),
                    new OpenLayers.Control.ToolPanel()
                ]
            });
            // set z-index of container to be under search view z-index of 666
            this.map.layerContainerDiv.style.zIndex = 600;
            if (this.restricted_extent) {
                this.map.restrictedExtent = OpenLayers.Bounds.fromString(this.restricted_extent);
                if (this.projection != this.map.getProjection()) {
                    this.map.restrictedExtent = this.map.restrictedExtent.transform(this.projection, this.map.getProjection());
                }
            }
            this.map.addControls(this.selectFeatureControls);
            this.map.zoomToMaxExtent();
        }
    },

    do_show: function () {
        var self = this;
        this._super();

        // Wait for element to be rendered before adding the map
        core.bus.on('DOM_updated', self.view_manager.is_in_DOM, function () {
            self.render_map();
        });
    },
    open_record: function (feature, options) {
        oid = feature.attributes.id
        if (this.dataset.select_id(oid)) {
            this.do_switch_view('form', null, options); //, null, { mode: "edit" });
        } else {
            this.do_warn("Geoengine: could not find id#" + oid);
        }
    },

});
// here you may tweak globals object, if any, and play with on_* or do_* callbacks on them

var utils = {
    color: {

        colorPalette: [
            "00FFFF", "FF00FF", "000080", "00FF00", "FFFF00", "FF0000",
            "0000FF", "008080", "FFB300", "803E75", "FF6800", "A6BDD7",
            "C10020", "CEA262", "817066", "007D34", "F6768E", "FF7A5C",
            "53377A", "B32851", "93AA00", "593315", "F13A13", "232C16"
        ],

        /**
        * Converts an HSV color value to RGB. Conversion formula
        * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
        * Assumes h, s, and v are contained in the set [0, 1] and
        * returns r, g, and b in the set [0, 255].
        *
        * @param   Number  h       The hue
        * @param   Number  s       The saturation
        * @param   Number  v       The value
        * @return  Array           The RGB representation
        */
        hsvToRgb: function(h, s, v) {
            var r, g, b;

            var i = Math.floor(h * 6);
            var f = h * 6 - i;
            var p = v * (1 - s);
            var q = v * (1 - f * s);
            var t = v * (1 - (1 - f) * s);

            switch(i % 6) {
                case 0: r = v, g = t, b = p; break;
                case 1: r = q, g = v, b = p; break;
                case 2: r = p, g = v, b = t; break;
                case 3: r = p, g = q, b = v; break;
                case 4: r = t, g = p, b = v; break;
                case 5: r = v, g = p, b = q; break;
            }

            return [r * 255, g * 255, b * 255];
        },

        /**
        * Converts an RGB color value to Hex.
        * Assumes r, g, and b are contained in the set [0, 255]
        *
        * @param   Number  r       The red color value
        * @param   Number  g       The green color value
        * @param   Number  b       The blue color value
        * @return  Array           The HSV representation
        */
        rgbToHex: function(r, g, b) {
            var colorBase10 = (r + 256 * g + 256 * 256 * b).toString(16);
            while (colorBase10.length < 6) {
                colorBase10 = '0' + colorBase10;
            }
            return colorBase10;
        },

        /**
        * Method: generateDistinctColors
        *
        * Parameters:
        * nb - {integer} number of distinct colors to generate (max 768)
        */
        generateDistinctColors: function(nb) {
            var palette = utils.color.colorPalette;
            // use the static palette is few colors else dynamically generate a new
            // palette
            if (nb <= palette.length) {
                return palette.slice(0, nb);
            } else {
                var h, s, v; // hue, value, saturation of the HSV color space
                var SV_RANGE = 0.6; // empiric value
                var SV_MAXVALUE = 0.9; // empiric value
                var HUE_NB_VARIATIONS_PER_SV = 20; // empiric value
                var sv_variation = Math.ceil(nb/HUE_NB_VARIATIONS_PER_SV);
                var it; // iterator which value is: 0 <= it <= sv_variation
                var out = [];
                for (var i=0; i<nb; i+=1) {
                    h = i/nb;
                    it = i % sv_variation;
                    s = v = (it == sv_variation-1) ?
                        SV_MAXVALUE : SV_MAXVALUE - it*(SV_RANGE/(sv_variation-1));
                    out.push(this.rgbToHex.apply(this, _.map(
                        this.hsvToRgb(i/nb, s, v),
                        function(num) {
                            return Math.round(num);
                        })
                    ));
                }
                return out;

            }
        }
    }
};

core.view_registry.add('geoengine', GeoengineView);

return GeoengineView;
});
