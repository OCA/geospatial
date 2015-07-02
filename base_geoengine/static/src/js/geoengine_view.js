/*---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * License in __openerp__.py at root level of the module
 *---------------------------------------------------------
*/

openerp.base_geoengine = function(openerp) {
    //var map, layer, vectorLayers = [];
    //TODO: remove this DEBUG
    map = null;
    this.zoom_to_extent_ctrl = null;
    /* CONSTANTS */
    var DEFAULT_BEGIN_COLOR = "#FFFFFF";
    var DEFAULT_END_COLOR = "#000000";
    var DEFAULT_MIN_SIZE = 5; // for prop symbols only
    var DEFAULT_MAX_SIZE = 15; // for prop symbols only
    var DEFAULT_NUM_CLASSES = 5; // for choroplets only
    var LEGEND_MAX_ITEMS = 10;

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
                        new ol.layer.Tile({
                            title: l.name,
                            visible: !l.overlay,
                            type:'base',
                            source: new ol.source.OSM()
                        })
                    );
                    break;
                case "mapbox":
                    out.push(
                        new ol.layer.Tile({
                            title: l.name,
                            visible: !l.overlay,
                            type:'base',
                            source: new ol.source.MapQuest({layer: 'sat'})
                        })
                     );
                    break;
                case "swisstopo":
                    var resolutions = [4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5];
                    if (l.swisstopo_type == 'ch.swisstopo.swissimage') {
                        resolutions.push(2, 1.5, 1, 0.5);
                    }
                    out.push(
                        new OpenLayers.Layer.WMTS({
                            name: l.name,
                            layer: l.swisstopo_type,
                            formatSuffix: 'jpeg',
                            url: ['https://wmts0.geo.admin.ch/', 'https://wmts1.geo.admin.ch/', 'https://wmts2.geo.admin.ch/'],
                            projection: 'EPSG:21781',
                            units: 'm',
                            resolutions: resolutions,
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
            this.overlaysGroup = null;
        },
        limit: function() {
            return false;
            var menu = document.getElementById('query_limit');
            var limit = parseInt(menu.options[menu.selectedIndex].value);
            if (limit > 0) {
                return limit;
            } else {
                return false;
            }
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
                view_loaded_def = openerp.web.fields_view_get({
                    model: this.dataset._model,
                    view_id: this.view_id,
                    view_type: 'geoengine',
                    context: this.dataset.get_context(),
                });
            }
            return this.alive(view_loaded_def).then(function(r) {
                self.fields_view = r;
                return $.when(self.view_loading(r)).then(function() {
                    self.trigger('view_loaded', r);
                });
            });
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
            var vectorSource = new ol.source.Vector({
            });
            _.each(data, function(item) {
                attributes = _.clone(item);
                _.each(_.keys(self.geometry_columns), function(item) {
                    delete attributes[item];
                });
                var json_geometry = item[cfg.geo_field_id[1]];
                if (json_geometry){
                    vectorSource.addFeature(
                        new ol.Feature({
                            geometry: new ol.format.GeoJSON().readGeometry(json_geometry),
                            attributes: attributes
                        })
                    );
                }
            });
            styleInfo = self.styleVectorLayer(cfg, data);
            // init legend
            parentContainer = self.$el.find('#map_legend');
            var elLegend = $(styleInfo.legend || '<div/>');
            elLegend.hide();
            parentContainer.append(elLegend);
            var lv = new ol.layer.Vector({
                source: vectorSource,
                title: cfg.name,
                //opacity: 0.8, //TODO configurable opacity to be applied on 
                style: styleInfo.style
            });
            lv.on('change:visible', function(e){
                if(lv.getVisible()){
                    elLegend.show();
                } else {
                    elLegend.hide();
                }
            });
            return lv;
        },

        extractLayerValues: function(cfg, data) {
            var values = [];
            var indicator = cfg.attribute_field_id[1];
            _.each(data, function(item) {
                values.push(item[indicator]);
            });
            return values;
        },

        styleVectorLayer: function(cfg, data) {
            var self = this;
            var indicator = cfg.attribute_field_id[1];
            var opacity = 0.8; // TODO to be defined on cfg
            var begin_color = chroma(cfg.begin_color || DEFAULT_BEGIN_COLOR).alpha(opacity).css();
            var end_color = chroma(cfg.end_color || DEFAULT_END_COLOR).alpha(opacity).css();
            switch (cfg.geo_repr) {
                case "colored":                    
                    var values = self.extractLayerValues(cfg, data);
                    var nb_class = cfg.nb_class || DEFAULT_NUM_CLASSES
                    var scale = chroma.scale([begin_color, end_color]);
                    var serie = new geostats(values);
                    switch (cfg.classification) {
                        case "unique":
                            var vals = serie.getClassUniqueValues();
                            scale = chroma.scale('RdYlBu').domain([0, vals.length], vals.length);
                            break;
                        case "quantile":
                            serie.getClassQuantile(nb_class);
                            var vals = serie.getRanges();
                            scale = scale.domain([0, vals.length], vals.length);
                            break;
                        case "interval":
                            serie.getClassEqInterval(nb_class);
                            displayLegend = true;
                            var vals = serie.getRanges();
                            scale = scale.domain([0, vals.length], vals.length);
                            break;
                    }
                    var colors = [];
                    _.each(scale.colors(mode='hex'), function(color){
                        colors.push(chroma(color).alpha(opacity).css());
                    });
                    var styles_map = {};
                    _.each(colors, function(color) {
                        if (color in styles_map) {
                            return;
                        } 
                        var fill = new ol.style.Fill({
                            color: color
                        });
                        var stroke = new ol.style.Stroke({
                            //color: color,
                            color: '#333333',
                            width: 1
                        });
                        var styles = [
                            new ol.style.Style({
                              image: new ol.style.Circle({
                                fill: fill,
                                stroke: stroke,
                                radius: 5
                              }),
                              fill: fill,
                              stroke: stroke
                            })
                        ];
                        styles_map[color] = styles; 
                    });
                    var legend = null;
                    if(vals.length <= LEGEND_MAX_ITEMS){
                        serie.setColors(colors);
                        legend = serie.getHtmlLegend(null, cfg.name, 1);
                    }
                    return {
                        style : function(feature, resolution) {
                            var value = feature.get('attributes')[indicator];
                            var color_idx = self.getClass(value, vals);
                            return styles_map[colors[color_idx]];
                         }, 
                        legend: legend
                    };
                    break;
                case "proportion":
                    var values = self.extractLayerValues(cfg, data);
                    var serie = new geostats(values);
                    var styles_map = {};
                    var minSize = cfg.min_size || DEFAULT_MIN_SIZE;
                    var maxSize = cfg.max_size || DEFAULT_MAX_SIZE;
                    var minVal = serie.min();
                    var maxVal = serie.max();
                    var fill = new ol.style.Fill({
                        color: begin_color
                    });
                    var stroke = new ol.style.Stroke({
                        color: '#333333',
                        width: 1
                    });
                    _.each(values, function(value) {
                        if (value in styles_map) {
                            return;
                        }
                        var radius = (value - minVal) / (maxVal - minVal) *
                            (maxSize - minSize) + minSize;
                        var styles = [
                            new ol.style.Style({
                              image: new ol.style.Circle({
                                fill: fill,
                                stroke: stroke,
                                radius: radius
                              }),
                              fill: fill,
                              stroke: stroke
                            })
                        ];
                        styles_map[value] = styles;
                    });
                    
                   
                    return {
                         style : function(feature, resolution) {
                             var value = feature.get('attributes')[indicator];
                             return styles_map[value];
                         },
                         legend : ''
                    };
                    break;
                default: // basic
                    var fill = new ol.style.Fill({
                        color: begin_color
                    });
                    var stroke = new ol.style.Stroke({
                        color: '#333333',
                        width: 1
                    });
                    var styles = [
                        new ol.style.Style({
                          image: new ol.style.Circle({
                            fill: fill,
                            stroke: stroke,
                            radius: 5
                          }),
                          fill: fill,
                          stroke: stroke
                        })
                    ];
                    return {
                         style : function(feature, resolution) {
                              return styles;
                         },
                         legend : ''
                    };
                    break;
            }
        },

        getClass :function(val, a) {
            // uniqueValues classification
            idx = a.indexOf(val);
            if (idx > -1){
                return idx;
            }
            
            // range classification
            var separator = ' - '
            for(var i= 0; i < a.length; i++) {
                // all classification except uniqueValues
                if(a[i].indexOf(separator) != -1) {
                    var item = a[i].split(separator);
                    if(val <= parseFloat(item[1])) {return i;}
                } else {
                    // uniqueValues classification
                    if(val == a[i]) {
                        return i;
                    }
                }
            }
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
            map.removeLayer(this.overlaysGroup);
            
            var vectorLayers = this.createVectorLayers(data);
            this.overlaysGroup = new ol.layer.Group({
                title: 'Overlays',
                layers: vectorLayers,
            }); 

            _.each(vectorLayers, function(vlayer) {
                // keep only one vector layer active at startup
                if (vlayer != vectorLayers[0]) {
                    vlayer.setVisible(false);
                }
            });
            map.addLayer(this.overlaysGroup);

            // zoom to data extent
            //map.zoomTo
            var extent = vectorLayers[0].getSource().getExtent();
            if (extent) {
                this.zoom_to_extent_ctrl.extent_ = extent;
                this.zoom_to_extent_ctrl.changed();
                map.getView().fitExtent(extent, map.getSize());
                var ids = [];
                // Javascript expert please improve this code
                for (var i=0, len=data.length; i<len; ++i) {
                    ids.push(data[i]['id']);
                }
                self.dataset.ids = ids;
            }
        },

        view_loading: function(data) {
            var self = this;
            this.fields_view = data;
            _.each(data.geoengine_layers.actives, function(item) {
                self.geometry_columns[item.geo_field_id[1]] = true;
            });
            this.$el.html(QWeb.render("GeoengineView", {"fields_view": this.fields_view, 'elem_id': this.elem_id}));
        },

        register_interaction: function(){
            // select interaction working on "click"
            var selectClick = new ol.interaction.Select({
              condition: ol.events.condition.click
            });
            selectClick.on('select', function(e) {
                var features = e.target.getFeatures(); 
                if (features.getLength() > 0){
                    var attributes = features.item(0).get('attributes');
                    $("#map_info").html(formatHTML(attributes));
                    $("#map_infobox").show();
                } else {
                    $("#map_infobox").hide();
                }
              });
            // select interaction working on "pointermove"
            var selectPointerMove = new ol.interaction.Select({
              condition: ol.events.condition.pointerMove
            });
            this.map.addInteraction(selectClick);
            this.map.addInteraction(selectPointerMove);
        },

        render_map: function() {
            if (_.isUndefined(this.map)){
                this.zoom_to_extent_ctrl = new ol.control.ZoomToExtent();
                map = new ol.Map({
                    layers: [new ol.layer.Group({
                        title: 'Base maps',
                        layers: openerp.base_geoengine.createBackgroundLayers(this.fields_view.geoengine_layers.backgrounds),
                    })],
                    target: 'olmap',
                    view: new ol.View({
                        center: [0, 0],
                        zoom: 2
                      }),
                      controls: ol.control.defaults().extend([
                        new ol.control.FullScreen(),
                        new ol.control.ScaleLine(),
                        this.zoom_to_extent_ctrl
                      ]),
                });
                var layerSwitcher = new ol.control.LayerSwitcher({});
                map.addControl(layerSwitcher);
                this.map = map;
                this.register_interaction();
                this.do_search(self.domains, null, self.offet);
            }
        },

        do_show: function () {
            this._super();
            this.render_map();
        },

    });

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
                styleMap: new OpenLayers.StyleMap({
                    'default': new OpenLayers.Style({
                    fillColor: '#ee9900',
                    fillOpacity: 0.7,
                    strokeColor: '#ee9900',
                    strokeOpacity: 1,
                    strokeWidth: 3,
                    pointRadius: 6
                    }),
                    'select': new OpenLayers.Style({
                    fillColor: 'red',
                    strokeColor: 'red'
                    }),
                    'temporary': new OpenLayers.Style({
                    fillColor: 'blue',
                    strokeColor: 'blue'
                    })
                }),
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

        add_tab_listener: function() {
            var tab = this.$el.closest('.ui-tabs-panel');
            var self = this;
            tab.parent().on( "tabsactivate", function(event, ui) {
                if (! _.isObject(ui.newPanel)) {
                    return;
                }
                geo_tab_id = self.$el.closest('.oe_notebook_page').get(0).id;
                active_tab_id = ui.newPanel.get(0).id;
                if (_.isEqual(geo_tab_id, active_tab_id)) {
                      self.render_map();
                      return;
                }
            });
        },

        start: function() {
            this._super.apply(this, arguments);
            if (this.map) {
                return;
            }
            this.view.on("change:actual_mode", this, this.on_mode_change);
            var self = this;
            // add a listener on parent tab if it exists in order to refresh geoengine view
            self.add_tab_listener();
            // We blacklist all other fields in order to avoid calling get_value inside the build_context on field widget which aren't started yet
            var blacklist = this.view.fields_order.slice();
            delete blacklist[this.name];
            var rdataset = new openerp.web.DataSetStatic(self, self.view.model, self.build_context(blacklist));
            rdataset.call("get_edit_info_for_geo_column", [self.name, rdataset.get_context()], false, 0).then(function(result) {
                self.layers = self.create_edit_layers(self, result);
                self.geo_type = result.geo_type;
                self.default_extent = result.default_extent;
                self.srid = result.srid;
                if (self.$el.is(':visible')){
                    self.render_map();
                }
            });
        },

        set_value: function(value) {
            this._super.apply(this, arguments);
            this.value = value;
            if (this.map) {
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
        },

        on_mode_change: function() {
            this.render_map();
            this.$el.toggle(!this.invisible);
        },

        render_map: function() {
            if (_.isNull(this.map)){
                this.map = new OpenLayers.Map({
                    theme: null,
                    layers: this.layers[0]
                });
                this.map.addLayer(this.layers[1]);
                this.modify_control = new OpenLayers.Control.ModifyFeature(this.layers[1]);
                if (this.geo_type == 'POINT' || this.geo_type == 'MULTIPOINT') {
                    this.modify_control.mode = OpenLayers.Control.ModifyFeature.DRAG;
                }
                this.map.addControl(this.modify_control);

                var handler = null;
                if (this.geo_type == 'POLYGON' || this.geo_type == 'MULTIPOLYGON') {
                    handler = OpenLayers.Handler.Polygon;
                } else if (this.geo_type == 'LINESTRING' || this.geo_type == 'MULTILINESTRING') {
                    handler = OpenLayers.Handler.Path;
                } else if (this.geo_type == 'POINT' || this.geo_type == 'MULTIPOINT') {
                    handler = OpenLayers.Handler.Point;
                } else {
                    // FIXME: unsupported geo type
                }
                this.draw_control = new OpenLayers.Control.DrawFeature(this.layers[1], handler);
                this.map.addControl(this.draw_control);

                this.default_extend = OpenLayers.Bounds.fromString(this.default_extent).transform('EPSG:900913', this.map.getProjection());
                this.map.zoomToExtent(this.default_extend);
                this.format = new OpenLayers.Format.GeoJSON({
                    internalProjection: this.map.getProjection(),
                    externalProjection: 'EPSG:' + this.srid
                });
                this.map.render(this.name);
                $(document).trigger('FieldGeoEngineEditMap:ready', [this.map]);
                this.set_value(this.value);
            }
            if (this.get("effective_readonly") || this.force_readonly) {
                this.modify_control.deactivate();
            } else {
                this.modify_control.activate();
                this.value === false ? this.draw_control.activate() : this.draw_control.deactivate();
            }
        },
    });

    openerp.web.form.widgets.add('geo_edit_map', 'openerp.base_geoengine.FieldGeoEngineEditMap');

    openerp.base_geoengine.FieldGeoEngineEditMapReadonly = openerp.base_geoengine.FieldGeoEngineEditMap.extend({
        init: function(view, node) {
            this.force_readonly = true;
            this._super(view, node);
         }
    });
    openerp.web.form.widgets.add('geo_edit_map_readonly', 'openerp.base_geoengine.FieldGeoEngineEditMapReadonly');

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