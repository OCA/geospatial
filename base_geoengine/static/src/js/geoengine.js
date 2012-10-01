/*---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * License in __openerp__.py at root level of the module
 *---------------------------------------------------------*/

openerp.base_geoengine = function (openerp) {
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
            strokeWidth: 1,
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
        var oid = ''
        for (var key in a) {
            if (a.hasOwnProperty(key)) {
                var val = a[key];
                if (val == false){
                    continue;
                }
                var label = ''
                if (val instanceof Array){
                    str.push('<span style="font-weight: bold">' + key.charAt(0).toUpperCase() + key.slice(1) + '</span>: ' +val[1])
                } else {
                    label = '<span style="font-weight: bold">' + key.charAt(0).toUpperCase() + key.slice(1) + '</span>: ' +val;
                     if (key == 'id'){
                        oid = label;
                    } else {
                        str.push(label);
                    }
                }
            }
        }
        str.unshift(oid)
        return str.join('<br />');
    };

    /** 
        * Method: createBackgroundLayers
        * creates background layers from config
        * 
        * Parameters:
        * bg_layers - {Array} the background layers array of config objects
        */
    var createBackgroundLayers = function(bg_layers) {
        var out = [];
        _.each(bg_layers, function (l) {
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

    QWeb = openerp.web.qweb
    QWeb.add_template('/base_geoengine/static/src/xml/geoengine.xml');
    openerp.web.views.add('geoengine', 'openerp.base_geoengine.GeoengineView');
    openerp.base_geoengine.GeoengineView = openerp.web.View.extend({

        init: function (parent, dataset, view_id, options) {
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
        limit: function(){
            var menu = document.getElementById('query_limit');
            var limit = parseInt(menu.options[menu.selectedIndex].value)
            if (limit > 0){
                return limit
                } 
            else {return -1}
        }, 
        start: function() {
            return this.rpc("/web/view/load", {
                "model": this.model,
                "view_id": this.view_id,
                "view_type": "geoengine"
            }, this.on_loaded);
        },

        do_hide: function () {
            this.$element.hide();
        },

        do_show: function () {

            if (this.dataset.ids.length) {
                var self = this;
                self.dataset.read_slice(_.keys(self.fields_view.fields), {'domain':self.domains, 'limit':self.limit(), 'offset':self.offset}).then(self.do_load_vector_data);
            }
            this.$element.show();
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
                        fillColor: cfg.begin_color,
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
                        fillColor: "${color}",
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
            if(!map){
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
                var ids = []
                // Javascript expert please improve this code
                for (var i=0, len=data.length; i<len; ++i) {
                    ids.push(data[i]['id'])
                }
                self.dataset.ids = ids
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
            this.$element.html(QWeb.render("GeoengineView", {"fields_view": this.fields_view, 'elem_id': this.elem_id}));

            var google = false;
            var backgrounds = data.geoengine_layers.backgrounds;
            for (var i=0,len=backgrounds.length; i<len; i++) {
                var l = backgrounds[i];
                if(l.raster_type == 'google') {
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
                layers: createBackgroundLayers(this.fields_view.geoengine_layers.backgrounds),
                displayProjection: new OpenLayers.Projection("EPSG:4326"),
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
            $('div#the_map').animate({height: $(window).height()-300+'px'})
            map.addControls(this.selectFeatureControls);
            map.zoomToMaxExtent();
            var self = this;
            // if (this.dataset.ids.length) {
            //     this.dataset.read_ids(this.dataset.ids, _.keys(self.fields_view.fields), self.do_load_vector_data);
            // } else {
            //     this.dataset.read_slice(_.keys(this.fields_view.fields), {}, this.do_load_vector_data);
            // }
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

                switch(i % 6){
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
                    colorBase10 = '0' + colorBase10
                }
                return colorBase10
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
        if(order == 1) {
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
