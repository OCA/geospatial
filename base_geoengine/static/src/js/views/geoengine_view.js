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
"use strict";

/*---------------------------------------------------------
 * Odoo geoengine view
 *---------------------------------------------------------*/

var core = require('web.core');
var time = require('web.time');

var View = require('web.View');
var QWeb = require('web.QWeb');
var GeoengineRecord = require('base_geoengine.Record');

var formats = require('web.formats');
var session = require('web.session');
var utils = require('web.utils');

var geoengine_common = require('base_geoengine.geoengine_common');

var _lt = core._lt;

//var map, layer, vectorLayers = [];
//TODO: remove this DEBUG
var map = null;

/* CONSTANTS */
var DEFAULT_BEGIN_COLOR = "#FFFFFF";
var DEFAULT_END_COLOR = "#000000";
var DEFAULT_MIN_SIZE = 5; // for prop symbols only
var DEFAULT_MAX_SIZE = 15; // for prop symbols only
var DEFAULT_NUM_CLASSES = 5; // for choroplets only
var LEGEND_MAX_ITEMS = 10;

/**
 * Method: formatFeatureHTML
 * formats attributes into a string
 *
 * Parameters:
 * a - {Object}
 */
var formatFeatureHTML = function(a, fields) {
    var str = [];
    var oid = '';
    for (var key in a) {
        if (a.hasOwnProperty(key)) {
            var val = a[key];
            if (val === false) {
                continue;
            }
            var span = '';
            if (fields.hasOwnProperty(key)) {
                var field = fields[key];
                var label = field.string;
                if (field.type === 'selection') {
                    // get display value of selection option
                    for (var option in field.selection) {
                        if (field.selection[option][0] === val) {
                            val = field.selection[option][1];
                            break;
                        }
                    }
                }
                if (val instanceof Array) {
                    str.push('<span style="font-weight: bold">' + label + '</span>: ' +val[1]);
                } else {
                    span = '<span style="font-weight: bold">' + label + '</span>: ' +val;
                     if (key === 'id') {
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
/**
 * Method: formatFeatureListHTML
 * formats attributes into a string
 *
 * Parameters:
 * features - [Array]
 */
var formatFeatureListHTML = function(features) {
    var str = [];
    // count unique record selected through all features
    var selected_ids = [];
    features.forEach(function(x) {
        var rec_id = x.get('attributes').id;
        if (selected_ids.indexOf(rec_id) < 0) {
            selected_ids.push(rec_id);
        }
    });
    str.push(selected_ids.length + ' selected records');
    return str.join('<br />');
};

var GeoengineView = View.extend(geoengine_common.GeoengineMixin, {
    template: "GeoengineView",
    display_name: _lt('Geoengine'),
    icon: 'fa-map-o',
    events: {
        'click a.ol-popup-closer': 'hide_popup',
        'click a.ol-popup-edit': 'open_popup_record',
    },

    init: function() {
        this._super.apply(this, arguments);
        this.qweb = new QWeb(session.debug, {_s: session.origin});
        this.view_type = 'geoengine';
        this.geometry_columns = {};
        this.overlaysGroup = null;
        this.vectorSources = [];
        this.zoom_to_extent_ctrl = null;
        this.popup_element = undefined;
        this.overlayPopup = undefined;
        this.featurePopup = undefined;
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
        var options = {};
        var rules = [];
        var new_rule, style;

        for (var i in symbols) {

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
        );

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

    open_popup_record: function() {
        var self = this;
        self.open_record(self.featurePopup);
    },

    hide_popup: function() {
        var self = this;
        self.overlayPopup.setPosition(undefined);
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
        var geostat = null;
        var vectorSource = new ol.source.Vector({});
        if (data.length === 0) {
            return new ol.layer.Vector({
                source: vectorSource,
                title: cfg.name,
            });
        }
        _.each(data, function(item) {
            var attributes = _.clone(item);
            _.each(_.keys(self.geometry_columns), function(item) {
                delete attributes[item];
            });

            if (cfg.display_polygon_labels === true) {
                attributes.label = item[cfg.attribute_field_id[1]];
            }
            else {
                attributes.label = '';
            }

            var json_geometry = item[cfg.geo_field_id[1]];
            if (json_geometry) {
                vectorSource.addFeature(
                    new ol.Feature({
                        geometry: new ol.format.GeoJSON().readGeometry(json_geometry),
                        attributes: attributes,
                    })
                );
            }
        });
        var styleInfo = self.styleVectorLayer(cfg, data);
        // init legend
        var parentContainer = self.$el.find('#map_legend');
        var elLegend = $(styleInfo.legend || '<div/>');
        elLegend.hide();
        parentContainer.append(elLegend);
        var lv = new ol.layer.Vector({
            source: vectorSource,
            title: cfg.name,
            active_on_startup: cfg.active_on_startup,
            style: styleInfo.style,
        });
        lv.on('change:visible', function(e){
            if(lv.getVisible()){
                elLegend.show();
            } else {
                elLegend.hide();
            }
        });
        this.vectorSources.push(vectorSource);
        if (cfg.layer_opacity){
            lv.setOpacity(cfg.layer_opacity);
        }
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
                var vals = null;
                switch (cfg.classification) {
                    case "unique":
                        vals = serie.getClassUniqueValues();
                        scale = chroma.scale('RdYlBu').domain([0, vals.length], vals.length);
                        break;
                    case "quantile":
                        serie.getClassQuantile(nb_class);
                        vals = serie.getRanges();
                        scale = scale.domain([0, vals.length], vals.length);
                        break;
                    case "interval":
                        serie.getClassEqInterval(nb_class);
                        vals = serie.getRanges();
                        scale = scale.domain([0, vals.length], vals.length);
                        break;
                }
                var colors = [];
                _.each(scale.colors(mode='hex'), function(color){
                    colors.push(chroma(color).alpha(opacity).css());
                });
                var styles_map = {};
                var styles;
                _.each(colors, function(color) {
                    if (color in styles_map) {
                        return;
                    }
                    var fill = new ol.style.Fill({
                        color: color
                    });
                    var stroke = new ol.style.Stroke({
                        color: '#333333',
                        width: 1
                    });
                    styles = [
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
            default: // basic
                var fill = new ol.style.Fill({
                    color: begin_color
                });
                var stroke = new ol.style.Stroke({
                    color: '#333333',
                    width: 1
                });
                var olStyleText = new ol.style.Text({
                    text: "",
                    fill: new ol.style.Fill({
                      color: "#000000"
                    }),
                    stroke: new ol.style.Stroke({
                      color: "#FFFFFF",
                      width: 2
                    })
                });
                var styles = [
                    new ol.style.Style({
                      image: new ol.style.Circle({
                        fill: fill,
                        stroke: stroke,
                        radius: self.getBasicCircleRadius(cfg, data),
                      }),
                      fill: fill,
                      stroke: stroke,
                      text: olStyleText,
                    })
                ];
                return {
                     style : function(feature, resolution) {
                          var label_text = feature.values_.attributes.label;
                          if(label_text === false){
                            label_text = '';
                          }
                          styles[0].text_.text_ = label_text;
                          return styles;
                     },
                    legend: ''
                };
        }
    },

    getBasicCircleRadius: function(cfg, data) {
        return 5;
    },

    getClass :function(val, a) {
        // uniqueValues classification
        var idx = a.indexOf(val);
        if (idx > -1){
            return idx;
        }
        // range classification
        var separator = ' - ';
        for(var i= 0; i < a.length; i++) {
            // all classification except uniqueValues
            if(a[i].indexOf(separator) !== -1) {
                var item = a[i].split(separator);
                if(val <= parseFloat(item[1])) {return i;}
            } else {
                // uniqueValues classification
                if(val === a[i]) {
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

    createPopupOverlay: function() {
        var self = this;
        if(self.overlayPopup !== undefined) {
            return self.overlayPopup;
        }

        var $popup = self.$('.layer-popup');
        var popup_element = $popup.get(0);
        var overlayPopup = new ol.Overlay({
            element: popup_element,
            positioning: 'bottom-center',
            stopEvent: false
        });
        self.popup_element = popup_element;
        self.overlayPopup = overlayPopup;
        return overlayPopup;
    },

    getGeoengineRecord: function(record) {
        var self = this;
        var fields = self.fields_view.fields;
        var record_options = {
            fields: fields,
            model: self.model,
            qweb: self.qweb,
        };
        return new GeoengineRecord(self, record, record_options);
    },

    getCenterCoordinatesFromGeometry: function(geometry) {
        /**
         * Returns the center of geometry coordinatres.
         */
        return ol.extent.getCenter(geometry.getExtent());
    },

    showFeaturePopup: function(feature) {
        var self = this;
        var template_name = 'layer-box';
        if (self.qweb.templates[template_name]) {
            var geometry = feature.getGeometry();
            var coord = self.getCenterCoordinatesFromGeometry(geometry);
            self.overlayPopup.setPosition(coord);
            self.featurePopup = feature;
            var record = feature.get('attributes');
            var geoengine_record = self.getGeoengineRecord(record);
            self.$('.popup-content').empty();
            geoengine_record.appendTo(self.$('.popup-content'));
        }
    },

    do_load_vector_data: function(data) {
        var self = this;
        if (!self.map) {
            return;
        }

        map.removeLayer(self.overlaysGroup);

        var vectorLayers = self.createVectorLayers(data);
        self.overlaysGroup = new ol.layer.Group({
            title: 'Overlays',
            layers: vectorLayers,
        });

        self.createPopupOverlay();

        _.each(vectorLayers, function(vlayer) {
            // First vector always visible on startup
            if (vlayer !== vectorLayers[0] && !vlayer.values_.active_on_startup) {
                vlayer.setVisible(false);
            }
        });
        map.addLayer(self.overlaysGroup);
        map.addOverlay(self.overlayPopup);

        // zoom to data extent
        //map.zoomTo
        if (data.length) {
            var extent = vectorLayers[0].getSource().getExtent();
            self.zoom_to_extent_ctrl.extent_ = extent;
            self.zoom_to_extent_ctrl.changed();

            // When user quit fullscreen map, the size is set to undefined
            // So we have to check this and recompute the size.
            var size = map.getSize();
            if (size === undefined ){
                map.updateSize();
                size = map.getSize();
            }
            map.getView().fit(extent, map.getSize());

            var ids = [];
            // Javascript expert please improve this code
            for (var i=0, len=data.length; i<len; ++i) {
                ids.push(data[i]['id']);
            }
            self.dataset.ids = ids;
        }
    },

    view_loading: function(fv) {
        var self = this;
        self.fields_view = fv;
        _.each(fv.geoengine_layers.actives, function(item) {
            self.geometry_columns[item.geo_field_id[1]] = true;
        });
        return $.when();
    },

    willStart: function() {
        var self = this;
        var arch = self.fields_view.arch;
        _.each(arch.children, function(child) {
            if (child.tag === 'templates') {
                self.qweb.add_template(utils.json_node_to_xml(child));
            }
        });
        return self._super();
    },

    update_info_box: function(features) {
        var self = this;
        var $map_info = $("#map_info");
        var $map_infobox = $("#map_infobox");
        var $map_info_open = $('#map_info_open');
        var $map_info_filter_selection = $("#map_info_filter_selection");

        if (features.getLength() === 1){
            var attributes = features.item(0).get('attributes');
            $map_info.html(formatFeatureHTML(attributes, this.fields_view.fields));
            $map_info_open.show();
            $map_info_filter_selection.hide();
            $map_infobox.off().click(function() {
                self.open_record(features.item(0));
            });
            $map_infobox.show();
        } else if (features.getLength() > 1) {
            $map_info.html(formatFeatureListHTML(features));
            $map_info_open.hide();
            $map_info_filter_selection.show();
            $map_infobox.off().click(function() {
                self.filter_selection(features);
            });
            $map_infobox.show();
        } else {
            $map_infobox.hide();
            self.hide_popup();
        }
    },

    get_custom_selected_style_function: function() {
        var self = this;
        return function (feature, resolution) {
            var geometryType = feature.getGeometry().getType();
            var styles = ol.style.Style.createDefaultEditing();
            var geometryStyle = styles[geometryType];
            if (geometryType !== ol.geom.GeometryType.POINT) {
                return geometryStyle;
            }

            var geometryStylePoint = geometryStyle[0];
            return [new ol.style.Style({
                fill: geometryStylePoint.getFill(),
                stroke: geometryStylePoint.getStroke(),
                image: new ol.style.Circle({
                    fill: geometryStylePoint.image_.getFill(),
                    stroke: geometryStylePoint.image_.getStroke(),
                    radius: self.getBasicCircleRadius(),
                })
            })];
        }
    },

    register_interaction: function(){
        var self = this;
        // select interaction working on "click"

        var selectClick = new ol.interaction.Select({
            condition: ol.events.condition.click,
            style: self.get_custom_selected_style_function(),
        });
        selectClick.on('select', function(e) {
            var features = e.target.getFeatures();
            self.update_info_box(features);

            if(features.getLength() > 0) {
                var feature = features.item(0);
                self.showFeaturePopup(feature);
            }
        });

        // select interaction working on "pointermove"
        var selectPointerMove = new ol.interaction.Select({
            condition: ol.events.condition.pointerMove,
            style: self.get_custom_selected_style_function(),
        });

        // a DragBox interaction used to select features by drawing boxes
        var dragBox = new ol.interaction.DragBox({
          condition: ol.events.condition.shiftKeyOnly,
          style: new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: [0, 0, 255, 1]
            })
          })
        });

        var selectedFeatures = selectClick.getFeatures();
        dragBox.on('boxend', function(e) {
            // features that intersect the box are added to the collection of
            // selected features, and their names are displayed in the "info"
            // div
            var info = [];
            var extent = dragBox.getGeometry().getExtent();
            var layerVectors = self.map.getLayers().item(1).getLayers();
            var vectorSource;
            layerVectors.forEach(function(lv) {
                // enable selection only on visible layers
                if (lv.getVisible()) {
                    vectorSource = lv.getSource();
                    vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
                        if (selectedFeatures.getArray().indexOf(feature) < 0) {
                            selectedFeatures.push(feature);
                        }
                    });
                }
            });
            self.update_info_box(selectedFeatures);
        });

        this.map.addInteraction(dragBox);
        this.map.addInteraction(selectClick);
        this.map.addInteraction(selectPointerMove);
    },

    render_map: function() {
        var self = this;
        if (_.isUndefined(this.map)){
            self.zoom_to_extent_ctrl = new ol.control.ZoomToExtent();
            map = new ol.Map({
                layers: [new ol.layer.Group({
                    title: 'Base maps',
                    layers: self.createBackgroundLayers(self.fields_view.geoengine_layers.backgrounds),
                })],
                target: 'olmap',
                view: new ol.View({
                    center: [0, 0],
                    zoom: 2
                }),
                controls: ol.control.defaults().extend([
                    new ol.control.FullScreen(),
                    new ol.control.ScaleLine(),
                    self.zoom_to_extent_ctrl
                ]),
            });
            var layerSwitcher = new ol.control.LayerSwitcher({});
            map.addControl(layerSwitcher);
            self.map = map;
            self.register_interaction();
        }
    },

    do_show: function () {
        var self = this;
        this._super();

        // Wait for element to be rendered before adding the map
        core.bus.on('DOM_updated', self.ViewManager.is_in_DOM, function () {
            self.render_map();
        });
    },
    filter_selection: function(features) {
        var selected_ids = [];
        features.forEach(function (x) {selected_ids.push(x.get('attributes').id);});
        var selection_domain = [['id', 'in', selected_ids]];
        var searchview = this.ViewManager.searchview;
        searchview.query.add({
            category: _lt("Geo selection"),
            values: {label: _lt("Geo selection")},
            icon: 'fa-map-o',
            field: {
              get_context: function () { },
              get_domain: function() {return selection_domain;},
              get_groupby: function () { }
            }
        });
    },

    open_record: function (feature, options) {
        var attributes = feature.get('attributes');
        var oid = attributes.id;
        if (this.dataset.select_id(oid)) {
            this.do_switch_view('form', null, options); //, null, { mode: "edit" });
        } else {
            this.do_warn("Geoengine: could not find id#" + oid);
        }
    },

});

core.view_registry.add('geoengine', GeoengineView);

return GeoengineView;
});
