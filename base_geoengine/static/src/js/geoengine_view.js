/*---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * License in __openerp__.py at root level of the module
 *---------------------------------------------------------
*/

openerp.base_geoengine = function(openerp) {
    //var map, layer, vectorLayers = [];
    //TODO: remove this DEBUG
    map = null;
    layer = null;
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
    var formatHTML = function(a) {
        var str = [];
        var oid = '';
        for (var key in a) {
            if (a.hasOwnProperty(key)) {
                var val = a[key];
                if (val == false) {
                    continue;
                }
                var label = '';
                if (val instanceof Array) {
                    str.push('<span style="font-weight: bold">' + key.charAt(0).toUpperCase() + key.slice(1) + '</span>: ' +val[1]);
                } else {
                    label = '<span style="font-weight: bold">' + key.charAt(0).toUpperCase() + key.slice(1) + '</span>: ' +val;
                     if (key == 'id') {
                        oid = label;
                    } else {
                        str.push(label);
                    }
                }
            }
        }
        str.unshift(oid);
        return str.join('<br />');
    };

    /**
     * Method: createBackgroundLayers
     * creates background layers from config
     *
     * Parameters:
     * bg_layers - {Array} the background layers array of config objects
     */
    openerp.base_geoengine.createBackgroundLayers = function(bg_layers) {
        var out = [];
        _.each(bg_layers, function(l) {
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
                            "http://a.tiles.mapbox.com/v3/" + l.mapbox_type + "/${z}/${x}/${y}.png",
                            "http://b.tiles.mapbox.com/v3/" + l.mapbox_type + "/${z}/${x}/${y}.png",
                            "http://c.tiles.mapbox.com/v3/" + l.mapbox_type + "/${z}/${x}/${y}.png",
                            "http://d.tiles.mapbox.com/v3/" + l.mapbox_type + "/${z}/${x}/${y}.png"
                        ], {
                            sphericalMercator: true,
                            wrapDateLine: true,
                            numZoomLevels: 17,
                            attribution: "<a href='http://www.camptocamp.com' style='color:orange;font-weight:bold;background-color:#FFFFFF' target='_blank'>Powered by Camptocamp</a>\
                                      using <a href='http://www.openstreetmap.org/' target='_blank'>OpenStreetMap</a> raster"
                        })
                    );
                    break;
                case "swisstopo":
                    out.push(
                        new OpenLayers.Layer.WMTS({
                            name: l.name,
                            layer: l.swisstopo_type,
                            formatSuffix: 'jpeg',
                            url: ['https://wmts0.geo.admin.ch/', 'https://wmts1.geo.admin.ch/', 'https://wmts2.geo.admin.ch/'],
                            projection: 'EPSG:21781',
                            units: 'm',
                            resolutions: [4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5 ,2.5, 2, 1.5, 1, 0.5],
                            maxExtent: [420000, 30000, 900000, 350000],
                            requestEncoding: 'REST',
                            matrixSet: '21781',
                            style: 'default',
                            dimensions: ['TIME'],
                            params: {time: l.swisstopo_time},
                            attribution: "<a href='http://www.camptocamp.com' style='color:orange;font-weight:bold;background-color:#FFFFFF' target='_blank'>Powered by Camptocamp</a>\
                                      data <a href='http://www.swisstopo.admin.ch/' target='_blank'>&copy; swisstopo</a>"
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
        });
        return out;
    };

    var QWeb = openerp.web.qweb;
    QWeb.add_template('/base_geoengine/static/src/xml/geoengine.xml');
    openerp.web.views.add('geoengine', 'openerp.base_geoengine.GeoengineView');
    openerp.base_geoengine.GeoengineView = openerp.web.View.extend({

        init: function(parent, dataset, view_id, options) {
            this._super(parent);
            this.set_default_options(options);
            this.view_manager = parent;
            this.dataset = dataset;
            this.dataset_index = 0;
            this.model = this.dataset.model;
            this.view_id = view_id;
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
        },
        limit: function() {
            var menu = document.getElementById('query_limit');
            var limit = parseInt(menu.options[menu.selectedIndex].value);
            if (limit > 0) {
                return limit;
            } else {
                return -1;
            }
        },
        start: function() {
            return this.rpc("/web/view/load", {
                "model": this.model,
                "view_id": this.view_id,
                "view_type": "geoengine"
            }, this.on_loaded);
        },

        do_hide: function() {
            this.$el.hide();
        },

        do_show: function() {
            if (this.dataset.ids.length) {
                var self = this;
                self.dataset.read_slice(_.keys(self.fields_view.fields), {'domain':self.domains, 'limit':self.limit(), 'offset':self.offset}).then(self.do_load_vector_data);
            }
            this.$el.show();
        },

        do_search: function(domains, contexts, groupbys) {
            var self = this;
            self.dataset.read_slice(_.keys(self.fields_view.fields), {'domain':domains, 'limit':self.limit(), 'offset':self.offset}).then(self.do_load_vector_data);
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
            var vl = new OpenLayers.Layer.Vector(cfg.name, {
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
                        $("#map_info").html(formatHTML(event.feature.attributes));
                        $("#map_infobox").show();
                    },
                    "featureunselected": function() {
                        $("#map_infobox").hide();
                    }
                }
            });
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
            var colors = openerp.base_geoengine.utils.color.generateDistinctColors(nb);
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
            if (!map) {
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
            map.addLayers(this.vectorLayers);
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
                    map.zoomToExtent(bbox);
                } else {
                    map.setCenter(bbox.getCenterLonLat(), 15);
                }
                var ids = [];
                // Javascript expert please improve this code
                for (var i=0, len=data.length; i<len; ++i) {
                    ids.push(data[i]['id']);
                }
                self.dataset.ids = ids;
            }
        },

        on_loaded: function(data) {
            console.log("GeoengineView.on_loaded: function(data): arguments=");
            console.log(data);
            var self = this;
            this.fields_view = data;
            _.each(data.geoengine_layers.actives, function(item) {
                self.geometry_columns[item.geo_field_id[1]] = true;
            });
            this.$el.html(QWeb.render("GeoengineView", {"fields_view": this.fields_view, 'elem_id': this.elem_id}));

            var google = false;
            var backgrounds = data.geoengine_layers.backgrounds;
            for (var i=0,len=backgrounds.length; i<len; i++) {
                var l = backgrounds[i];
                if (l.raster_type == 'google') {
                    google = true;
                    break;
                }
            }
            if (google) {
                window.ginit = this.on_ready;
                $.getScript('http://maps.googleapis.com/maps/api/js?v=3.5&sensor=false&callback=ginit');
            }
            else {
                this.on_ready();
            }
        },

        on_ready: function() {
            //TODO: copy this mapbox dark theme in the addons
            OpenLayers.ImgPath = "http://js.mapbox.com/theme/dark/";
            map = new OpenLayers.Map('the_map', {
                layers: openerp.base_geoengine.createBackgroundLayers(this.fields_view.geoengine_layers.backgrounds),
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
            $('div#the_map').animate({height: $(window).height()-300+'px'});
            map.addControls(this.selectFeatureControls);
            map.zoomToMaxExtent();
            var self = this;
            self.dataset.read_slice(_.keys(self.fields_view.fields), {'domain':self.domains, 'limit':self.limit(), 'offset':self.offset}).then(self.do_load_vector_data);
        }

    });
    // here you may tweak globals object, if any, and play with on_* or do_* callbacks on them

    openerp.base_geoengine.utils = {

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
                var palette = openerp.base_geoengine.utils.color.colorPalette;
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

    //------------ EDIT WIDGET ----------------------------------------------

    openerp.base_geoengine.FieldGeoEngineEditMap = openerp.web.form.AbstractField.extend({
        template: 'FieldGeoEngineEditMap',

        geo_type: null,
        map: null,
        default_extent: null,
        format: null,
        force_readonly: null,
        modify_control: null,
        draw_control: null,

        create_edit_layers: function(self, field_infos) {
            var vl = new OpenLayers.Layer.Vector(self.name, {
                eventListeners : {
                    featuremodified: function(event) {
                        this._geometry = event.feature.geometry;
                        this.on_ui_change();
                    },
                    featureadded: function(event) {
                        // FIXME: simple to multi
                        if (this.geo_type == 'MULTIPOLYGON' && event.feature.geometry.CLASS_NAME == 'OpenLayers.Geometry.Polygon') {
                            this._geometry = new OpenLayers.Geometry.MultiPolygon(event.feature.geometry);
                        } else {
                            this._geometry = event.feature.geometry;
                        }
                        this.on_ui_change();
                    },
                    scope: this
                }
            });
            var rl = openerp.base_geoengine.createBackgroundLayers([field_infos.edit_raster]);
            rl.isBaseLayer = true;
            return [rl, vl];
        },

        start: function() {
            this._super.apply(this, arguments);
            if (this.map) {
                return;
            }
            this.view.on("change:actual_mode", this, this.on_mode_change);
            var self = this;
            // We blacklist all other fields in order to avoid calling get_value inside the build_context on field widget which aren't started yet
            var blacklist = this.view.fields_order.slice();
            delete blacklist[this.name];
            var rdataset = new openerp.web.DataSetStatic(self, self.view.model, self.build_context(blacklist));
            rdataset.call("get_edit_info_for_geo_column", [self.name, rdataset.get_context()], false, 0).then(function(result) {
                var layers = self.create_edit_layers(self, result);
                self.geo_type = result.geo_type;
                self.map = new OpenLayers.Map({
                    theme: null,
                    layers: layers[0]
                });
                self.map.addLayer(layers[1]);
                self.modify_control = new OpenLayers.Control.ModifyFeature(layers[1]);
                if (self.geo_type == 'POINT' || self.geo_type == 'MULTIPOINT') {
                    self.modify_control.mode = OpenLayers.Control.ModifyFeature.DRAG;
                }
                self.map.addControl(self.modify_control);

                var handler = null;
                if (self.geo_type == 'POLYGON' || self.geo_type == 'MULTIPOLYGON') {
                    handler = OpenLayers.Handler.Polygon;
                } else if (self.geo_type == 'LINESTRING' || self.geo_type == 'MULTILINESTRING') {
                    handler = OpenLayers.Handler.Path;
                } else if (self.geo_type == 'POINT' || self.geo_type == 'MULTIPOINT') {
                    handler = OpenLayers.Handler.Point;
                } else {
                    // FIXME: unsupported geo type
                }
                self.draw_control = new OpenLayers.Control.DrawFeature(layers[1], handler);
                self.map.addControl(self.draw_control);

                self.default_extend = OpenLayers.Bounds.fromString(result.default_extent).transform('EPSG:900913', self.map.getProjection());
               // self.map.zoomToExtent(self.default_extend);
                self.format = new OpenLayers.Format.GeoJSON({
                    internalProjection: self.map.getProjection(),
                    externalProjection: 'EPSG:' + result.srid
                });
                self.on_mode_change();
                self.set_value(self.value);
            });
        },

        set_value: function(value) {
            this._super.apply(this, arguments);
            this.value = value;
            if (this.map && this.view.get("actual_mode") !== "edit") {
                var vl = this.map.getLayersByName(this.name)[0];
                vl.destroyFeatures();
                if (this.value) {
                    var features = this.format.read(this.value);
                    vl.addFeatures(features, {silent: true});
                    this.map.zoomToExtent(vl.getDataExtent());
                } else {
                    this.map.zoomToExtent(this.default_extend);
                }
            }
        },

        on_ui_change: function() {
            this.set_value(this.format.write(this._geometry));
        },

        validate: function() {
            this.invalid = false;
            try {
                var vl = this.map.getLayersByName(this.name)[0];
                this.invalid = (this.required && jQuery.isEmptyObject(vl.features));
            } catch(e) {
                this.invalid = true;
            }
        },

        on_mode_change: function() {
            if (this.map) {
                this.map.render(this.id_for_label);
                var actual_mode = this.view.get("actual_mode");
                if (actual_mode == "view") {
                    this.modify_control.deactivate();
                } else if(actual_mode == "create" || !this.value) {
                    this.modify_control.activate();
                    this.draw_control.activate();
                } else if(actual_mode == "edit") {
                    this.modify_control.activate();
                    this.draw_control.deactivate();
                }
            }
            this.$el.toggle(!this.invisible);
        }
    });
    openerp.web.form.widgets.add('geo_edit_map', 'openerp.base_geoengine.FieldGeoEngineEditMap');

    openerp.base_geoengine.FieldGeoEngineEditMapReadonly = openerp.base_geoengine.FieldGeoEngineEditMap.extend({
        init: function(view, node) {
            this._super(view, node);
            this.force_readonly = true;
         }
    });
    openerp.web.form.widgets.add('geo_edit_map', 'openerp.base_geoengine.FieldGeoEngineEditMapReadonly');

    //-----------------------------------------------------------------------
    openerp.base_geoengine.FieldGeoPointXY = openerp.web.form.AbstractField.extend({
        template: 'FieldGeoPointXY',

        start: function() {
            this._super.apply(this, arguments);
            this.$input = this.$el.find('input');
            this.$input.change(this.on_ui_change);
            this.setupFocus(this.$input);
        },
        get_coords: function() {
            /* Get coordinates and check it has the right format
             *
             * @return [x, y]
             */
            var x = openerp.web.parse_value(this.$input.eq(0).val(), {type: 'float'});
            var y = openerp.web.parse_value(this.$input.eq(1).val(), {type: 'float'});
            return [x, y];
        },
        make_GeoJSON: function(coords) {
            return {"type": "Point", "coordinates": coords};
        },
        set_value: function(value) {
            this._super.apply(this, arguments);

            if (value) {
                var geo_obj = JSON.parse(value);
                this.$input.eq(0).val(geo_obj.coordinates[0]);
                this.$input.eq(1).val(geo_obj.coordinates[1]);
            } else {
                this.$input.val('');
            }
        },
        on_ui_change: function() {
            var coords = this.get_coords();
            if (coords[0] && coords[1]) {
                var json = this.make_GeoJSON(coords);
                this.value = JSON.stringify(json);
            } else {
                this.value = false;
            }

        },
        validate: function() {
            this.invalid = false;
            try {
                // get coords to check if floats
                var coords = this.get_coords();

                // make sure the two coordinates are set or None
                this.invalid = (this.required &&
                                (coords[0] === 0 || coords[1] === 0 ) ||
                                coords[0] === false && coords[1] !== false ||
                                coords[0] !== false && coords[1] === false);
            } catch(e) {
                this.invalid = true;
            }
        },
        update_dom: function() {
            this._super.apply(this, arguments);
            this.set_readonly(this.readonly);
        },
        set_readonly: function(readonly) {
            this.$input.prop('readonly', this.readonly);
        }
    });
    openerp.web.form.widgets.add('geo_point_xy', 'openerp.base_geoengine.FieldGeoPointXY');

    openerp.base_geoengine.FieldGeoPointXYReadonly = openerp.base_geoengine.FieldGeoPointXY.extend({
        template: 'FieldGeoPointXY.readonly',

        set_value: function(value) {
            this._super.apply(this, arguments);
            var show_value = '';
            if (value) {
                var geo_obj = JSON.parse(value);
                show_value = "(" + geo_obj.coordinates[0] + ", " + geo_obj.coordinates[1] + ")";
            }
            this.$el.find('div').text(show_value);
            return show_value;
        },
        validate: function() {
            this.invalid = false;
        }
    });
    openerp.web.form.widgets.add('geo_point_xy', 'openerp.base_geoengine.FieldGeoPointXYReadonly');

    openerp.base_geoengine.FieldGeoRect = openerp.web.form.AbstractField.extend({
        template: 'FieldGeoRect',

        start: function() {
            this._super.apply(this, arguments);
            this.$input = this.$el.find('input');
            this.$input.change(this.on_ui_change);
            this.setupFocus(this.$input);
        },
        get_coords: function() {
            /* Get coordinates in the input fields
             *
             * @return [[x1, y1],[x2, y2]]
             */
            var x1 = openerp.web.parse_value(this.$input.eq(0).val(), {type: 'float'});
            var y1 = openerp.web.parse_value(this.$input.eq(1).val(), {type: 'float'});
            var x2 = openerp.web.parse_value(this.$input.eq(2).val(), {type: 'float'});
            var y2 = openerp.web.parse_value(this.$input.eq(3).val(), {type: 'float'});

            return [[x1, y1], [x2, y2]];
        },
        make_GeoJSON: function(coords) {
            var p1 = coords[0];
            var p2 = [coords[0][0], coords[1][1]];
            var p3 = coords[1];
            var p4 = [coords[1][0], coords[0][1]];
            // Create a loop in clockwise
            var points = [[ p1, p2, p3, p4, p1 ]];
            return {"type": "Polygon", "coordinates": points};
        },
        set_value: function(value) {
            this._super.apply(this, arguments);

            if (value) {
                var geo_obj = JSON.parse(value);
                this.$input.eq(0).val(geo_obj.coordinates[0][0][0]);
                this.$input.eq(1).val(geo_obj.coordinates[0][0][1]);
                this.$input.eq(2).val(geo_obj.coordinates[0][2][0]);
                this.$input.eq(3).val(geo_obj.coordinates[0][2][1]);
            } else {
                this.$input.val('');
            }
        },
        correct_bounds: function(coords) {
            /* Reverse bounds if the upper right
             * point is smaller than bottom left
             *
             * @return [[x1, y1],[x2, y2]]
             */
            var x1 = coords[0][0],
            y1 = coords[0][1],
            x2 = coords[1][0],
            y2 = coords[1][1];

            var minx = Math.min(x1, x2);
            var maxx = Math.max(x1, x2);

            var miny = Math.min(y1, y2);
            var maxy = Math.max(y1, y2);

            return [[minx, miny], [maxx, maxy]];
        },
        on_ui_change: function() {
            var coords = this.get_coords();
            if (this.all_are_set(coords)) {

                coords = this.correct_bounds(coords);

                var json = this.make_GeoJSON(coords);
                this.value = JSON.stringify(json);
            } else {
                this.value = false;
            }
        },
        all_are_set: function(coords) {
            return (coords[0][0] !== false && coords[0][1] !== false &&
                    coords[1][0] !== false && coords[1][1] !== false);
        },
        none_are_set: function(coords) {
            return (coords[0][0] === false && coords[0][1] === false &&
                    coords[1][0] === false && coords[1][1] === false);
        },
        validate: function() {
            this.invalid = false;
            try {
                // get coords to check if floats
                var coords = this.get_coords();

                // make sure all the coordinates are set
                // if not None or if required
                this.invalid = (this.required ||
                                !this.none_are_set(coords)) &&
                    !this.all_are_set(coords);
            } catch(e) {
                this.invalid = true;
            }
        },
        update_dom: function() {
            this._super.apply(this, arguments);
            this.set_readonly(this.readonly);
        },
        set_readonly: function(readonly) {
            this.$input.prop('readonly', this.readonly);
        }
    });
    openerp.web.form.widgets.add('geo_rect', 'openerp.base_geoengine.FieldGeoRect');

    openerp.base_geoengine.FieldGeoRectReadonly = openerp.base_geoengine.FieldGeoRect.extend({
        template: 'FieldGeoRect.readonly',

        set_value: function(value) {
            this._super.apply(this, arguments);
            var show_value = '';
            if (value) {
                var geo_obj = JSON.parse(value);
                show_value = "(" + geo_obj.coordinates[0][0][0] + ", " + geo_obj.coordinates[0][0][1] + "), " +
                    "(" + geo_obj.coordinates[0][2][0] + ", " + geo_obj.coordinates[0][2][1] + ")";
            }
            this.$el.find('div').text(show_value);
            return show_value;
        },
        validate: function() {
            this.invalid = false;
        }
    });
    openerp.web.form.widgets.add('geo_rect', 'openerp.base_geoengine.FieldGeoRectReadonly');


   //-------------------------------------------------------------------------

};
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
//openerp.base_geoengine(openerp)
// vim:et fdc=0 fdl=0:
