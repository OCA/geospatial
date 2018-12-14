/* ---------------------------------------------------------
 * Odoo base_geoengine
 * Contributor Yannick Vaucher 2018 Camptocamp SA
 * License in __manifest__.py at root level of the module
 * ---------------------------------------------------------
*/
odoo.define('base_geoengine.GeoengineRenderer', function (require) {
    "use strict";

    var BasicRenderer = require('web.BasicRenderer');
    var utils = require('web.utils');
    var QWeb = require('web.QWeb');
    var session = require('web.session');

    var geoengine_common = require('base_geoengine.geoengine_common');

    /* CONSTANTS */
    var DEFAULT_BEGIN_COLOR = "#FFFFFF";
    var DEFAULT_END_COLOR = "#000000";
    var DEFAULT_MIN_SIZE = 5; // for prop symbols only
    var DEFAULT_MAX_SIZE = 15; // for prop symbols only
    var DEFAULT_NUM_CLASSES = 5; // for choroplets only
    var LEGEND_MAX_ITEMS = 10;

    /**
     * Formats attributes into a string
     *
     * @param {Object} a
     * @param {Object} fields
     */
    var formatFeatureHTML = function (a, fields) {
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
                        // Get display value of selection option
                        for (var option in field.selection) {
                            if (field.selection[option][0] === val) {
                                val = field.selection[option][1];
                                break;
                            }
                        }
                    }
                    if (val instanceof Array) {
                        str.push('<span style="font-weight: bold">' +
                                 label + '</span>: ' +val[1]);
                    } else {
                        span = '<span style="font-weight: bold">' +
                               label + '</span>: ' + val;
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
     * Formats attributes into a string
     *
     * @param {Array} features
     */
    var formatFeatureListHTML = function (features) {
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


    var GeoengineRenderer =
        BasicRenderer.extend(geoengine_common.GeoengineMixin, {

        events: {
            'click #map_infobox': '_onInfoBoxClicked',
        },

        /**
         * @constructor
         * @param {Widget} parent
         * @param {Any} state
         * @param {Object} params
         * @param {Boolean} params.hasSelectors
         */
        init: function (parent, state, params) {
            this._super.apply(this, arguments);

            this.qweb = new QWeb(session.debug, {_s: session.origin}, false);

            this.viewInfo = params.viewInfo;
            this.mapOptions = {
                'geoengine_layers': params.viewInfo.geoengine_layers,
            };

            this.selection = [];
            this.overlaysGroup = null;
            this.vectorSources = [];
            this.zoomToExtentCtrl = null;
            this.popupElement = undefined;
            this.overlayPopup = undefined;
            this.featurePopup = undefined;
            this.ids = {};

            this.geometryColumns = [];
            _.each(this.mapOptions.geoengine_layers.actives, function(item) {
                this.geometryColumns.push(item.geo_field_id[1]);
            }.bind(this));
        },

        /**
         * Called each time the renderer is attached into the DOM.
         */
        on_attach_callback: function () {
            var map = this._renderMap();
            $('#olmap').data('map', map);
            this._renderVectorLayers();
            return this._super();
        },

        // --------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------

        /**
         * @override
         */
        updateState: function (state) {
            var def = this._super.apply(this, arguments);
            this._renderVectorLayers();
            return def;
        },

        willStart: function () {
            var arch = this.viewInfo.arch;
            _.each(arch.children, function(child) {
                if (child.tag === 'templates') {
                    this.qweb.add_template(utils.json_node_to_xml(child));
                }
            }.bind(this));
            return this._super();
        },

        // --------------------------------------------------------------------
        // Private
        // --------------------------------------------------------------------

        /**
         * Render the map 
         *
         * @private
         * @returns {jQueryElement} a jquery element <tbody>
         */
        _renderMap: function () {
            if (_.isUndefined(this.map)){
                this.zoomToExtentCtrl = new ol.control.ZoomToExtent();
                var backgrounds = this.mapOptions.geoengine_layers.backgrounds;
                this.map = new ol.Map({
                    layers: [new ol.layer.Group({
                        title: 'Base maps',
                        layers: this.createBackgroundLayers(backgrounds),
                    })],
                    target: 'olmap',
                    view: new ol.View({
                        center: [0, 0],
                        zoom: 2,
                    }),
                    controls: ol.control.defaults().extend([
                        new ol.control.FullScreen(),
                        new ol.control.ScaleLine(),
                        new ol.control.LayerSwitcher(),
                        this.zoomToExtentCtrl,
                    ]),
                });
                this._registerInteraction();
            }
            return this.map;
        },

        /**
         * Main render function for the map. It is rendered as a div.
         *
         * @override
         * @private
         * returns {Deferred} this deferred is resolved immediately
         */
        _renderView: function () {
            var $map_div = $('<div>', {id: 'olmap', class: 'olmap'});
            var $map_infobox = $('<div>', {
                id: 'map_infobox',
                class: 'map_overlay',
            });
            var $map_info_open = $('<div>', {id: 'map_info_open'});

            $map_info_open.append($('<span>', {class: 'fa fa-edit'}));
            $map_infobox.append($map_info_open);

            var $map_info_filter_selection = $('<div>', {
                id: 'map_info_filter_selection',
            });
            var $filter_selection = $('<span>', {class: 'fa fa-filter'});
            $filter_selection.append('Filter selection');
            $map_info_filter_selection.append($filter_selection);
            $map_infobox.append($map_info_filter_selection);

            $map_infobox.append($('<div>', {id: 'map_info'}));

            $map_div.append($map_infobox);

            this.$el.addClass('o_geo_view').append($map_div);

            return this._super();
        },

        _hidePopup: function () {
            this.overlayPopup.setPosition(undefined);
        },

        /**
         * Method: _createVectorLayer
         *
         * Parameters:
         * @param {Object} cfg - config object specific to the vector layer
         * @param {Array(features)} data
         */
        _createVectorLayer: function (cfg, data) {
            if (!data.length) {
                return new ol.layer.Vector({
                    source: new ol.source.Vector(),
                    title: cfg.name,
                });
            }
            var vectorSource = new ol.source.Vector();
            _.each(data, function(item) {
                var attributes = _.clone(item['data']);
                _.each(this.geometryColumns, function(item) {
                    delete attributes[item];
                });

                if (cfg.display_polygon_labels === true) {
                    attributes.label = item[cfg.attribute_field_id[1]];
                } else {
                    attributes.label = '';
                }

                var json_geometry = item['data'][cfg.geo_field_id[1]];
                if (json_geometry) {
                    var feature = new ol.Feature({
                        geometry: new ol.format.GeoJSON()
                                        .readGeometry(json_geometry),
                        attributes: attributes,
                    });
                    var id = String(attributes.id);
                    this.ids[id] = item['id'];
                    vectorSource.addFeature(feature);
                }
            }.bind(this));
            var styleInfo = this._styleVectorLayer(cfg, data);
            // Init legend
            var parentContainer = this.$el.find('#map_legend');
            var elLegend = $(styleInfo.legend || '<div/>');
            elLegend.hide();
            parentContainer.append(elLegend);
            var lv = new ol.layer.Vector({
                source: vectorSource,
                title: cfg.name,
                active_on_startup: cfg.active_on_startup,
                style: styleInfo.style,
            });
            lv.on('change:visible', function (e) {
                if (lv.getVisible()) {
                    elLegend.show();
                } else {
                    elLegend.hide();
                }
            });
            this.vectorSources.push(vectorSource);
            if (cfg.layer_opacity) {
                lv.setOpacity(cfg.layer_opacity);
            }
            return lv;
        },

        _extractLayerValues: function (cfg, data) {
            var values = [];
            var indicator = cfg.attribute_field_id[1];
            _.each(data, function(item) {
                values.push(item.data[indicator]);
            });
            return values;
        },

        _styleVectorLayer: function (cfg, data) {
            var indicator = cfg.attribute_field_id[1];
            var opacity = 0.8; // TODO to be defined on cfg
            var begin_color = chroma(cfg.begin_color || DEFAULT_BEGIN_COLOR)
                                  .alpha(opacity).css();
            var end_color = chroma(cfg.end_color || DEFAULT_END_COLOR)
                                  .alpha(opacity).css();

            switch (cfg.geo_repr) {
                case 'colored':
                    var values = this._extractLayerValues(cfg, data);
                    var nb_class = cfg.nb_class || DEFAULT_NUM_CLASSES
                    var scale = chroma.scale([begin_color, end_color]);
                    var serie = new geostats(values);
                    var vals = null;

                    switch (cfg.classification) {
                        case 'unique':
                        case 'custom':
                            vals = serie.getClassUniqueValues();
                            scale = chroma.scale('RdYlBu')
                                          .domain([0, vals.length], vals.length);
                            break;
                        case 'quantile':
                            serie.getClassQuantile(nb_class);
                            vals = serie.getRanges();
                            scale = scale.domain([0, vals.length], vals.length);
                            break;
                        case 'interval':
                            serie.getClassEqInterval(nb_class);
                            vals = serie.getRanges();
                            scale = scale.domain([0, vals.length], vals.length);
                            break;
                    }
                    var colors = [];
                    if (cfg.classification == 'custom') {
                        _.each(vals, function (val) {
                            if (val) {
                                colors.push(chroma(val).alpha(opacity).css());
                            }
                        });
                    } else {
                        _.each(scale.colors(), function (color) {
                            colors.push(chroma(color).alpha(opacity).css());
                        });
                    }
                    var styles_map = {};
                    var styles;
                    _.each(colors, function (color) {
                        if (color in styles_map) {
                            return;
                        }
                        var fill = new ol.style.Fill({
                            color: color,
                        });
                        var stroke = new ol.style.Stroke({
                            color: '#333333',
                            width: 2,
                        });
                        styles = [
                            new ol.style.Style({
                              image: new ol.style.Circle({
                                  fill: fill,
                                  stroke: stroke,
                                  radius: 7,
                              }),
                              fill: fill,
                              stroke: stroke,
                            })
                        ];
                        styles_map[color] = styles;
                    });
                    var legend = null;
                    if (vals.length <= LEGEND_MAX_ITEMS) {
                        serie.setColors(colors);
                        legend = serie.getHtmlLegend(null, cfg.name, 1);
                    }
                    return {
                        style: function (feature, resolution) {
                            var value = feature.get('attributes')[indicator];
                            var color_idx = this._getClass(value, vals);
                            return styles_map[colors[color_idx]];
                        }.bind(this),
                        legend: legend,
                    };
                case 'proportion':
                    var values = this._extractLayerValues(cfg, data);
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
                        width: 2,
                    });
                    _.each(values, function (value) {
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
                            }),
                        ];
                        styles_map[value] = styles;
                    });

                    return {
                        style: function (feature, resolution) {
                            var value = feature.get('attributes')[indicator];
                            return styles_map[value];
                        },
                        legend : '',
                    };
                default:
                    // Basic
                    var fill = new ol.style.Fill({
                        color: begin_color,
                    });
                    var stroke = new ol.style.Stroke({
                        color: '#333333',
                        width: 2,
                    });
                    var olStyleText = new ol.style.Text({
                        text: '',
                        fill: new ol.style.Fill({
                            color: '#000000',
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#FFFFFF',
                            width: 5,
                        })
                    });
                    var styles = [
                        new ol.style.Style({
                            image: new ol.style.Circle({
                                fill: fill,
                                stroke: stroke,
                                radius: this._getBasicCircleRadius(cfg, data),
                            }),
                            fill: fill,
                            stroke: stroke,
                            text: olStyleText,
                        }),
                    ];
                    return {
                        style: function (feature, resolution) {
                            var label_text = feature.values_.attributes.label;
                            if (label_text === false) {
                                label_text = '';
                            }
                            styles[0].text_.text_ = label_text;
                            return styles;
                        },
                        legend: '',
                    };
            }
        },

        _getBasicCircleRadius: function (cfg, data) {
            return 5;
        },

        _getClass: function (val, a) {
            // uniqueValues classification
            var idx = a.indexOf(val);
            if (idx > -1) {
                return idx;
            }
            // Range classification
            var separator = ' - ';
            for (var i = 0; i < a.length; i++) {
                // All classification except uniqueValues
                if (a[i].indexOf(separator) !== -1) {
                    var item = a[i].split(separator);
                    if (val <= parseFloat(item[1])) {
                        return i;
                    }
                } else {
                    // uniqueValues classification
                    if (val === a[i]) {
                        return i;
                    }
                }
            }
        },

        /**
         * Creates vector layers from config and populates them with features
         *
         * Parameters:
         * @param {Array} data - vector data to be added to the vector layer
         */
        _createVectorLayers: function (data) {
            var out = [];
            var layers = this.mapOptions.geoengine_layers.actives;
            _.each(layers, function (item) {
                out.push(this._createVectorLayer(item, data));
            }.bind(this));
            return out;
        },

        _createPopupOverlay: function () {
            if (this.overlayPopup !== undefined) {
                return this.overlayPopup;
            }

            var $popup = this.$('.layer-popup');
            var popupElement = $popup.get(0);
            var overlayPopup = new ol.Overlay({
                element: popupElement,
                positioning: 'bottom-center',
                stopEvent: false,
            });
            this.popupElement = popupElement;
            this.overlayPopup = overlayPopup;
            return overlayPopup;
        },

        _getGeoengineRecord: function (record) {
            var record_options = {
                fields: this.viewInfo.fields,
                model: this.model,
                qweb: this.qweb,
            };
            return new GeoengineRecord(this, record, record_options);
        },

        _showFeaturePopup: function (feature) {
            var template_name = 'layer-box';
            if (this.qweb.templates[template_name]) {
                var coord = ol.extent.getCenter(feature.getGeometry()
                              .getExtent());
                this.overlayPopup.setPosition(coord);
                this.featurePopup = feature;
                var record = feature.get('attributes');
                var geoengine_record = this._getGeoengineRecord(record);
                this.$('.popup-content').empty();
                geoengine_record.appendTo(this.$('.popup-content'));
            }
        },

        _renderVectorLayers: function () {
            var data = this.state.data;

            this.map.removeLayer(this.overlaysGroup);
            this.ids = {};

            var vectorLayers = this._createVectorLayers(data);
            this.overlaysGroup = new ol.layer.Group({
                title: 'Overlays',
                layers: vectorLayers,
            });

            this._createPopupOverlay();

            _.each(vectorLayers, function (vlayer) {
                // First vector always visible on startup
                if (vlayer !== vectorLayers[0] &&
                    !vlayer.values_.active_on_startup) {
                    vlayer.setVisible(false);
                }
            });
            this.map.addLayer(this.overlaysGroup);
            this.map.addOverlay(this.overlayPopup);

            // Zoom to data extent
            if (data.length) {
                var extent = vectorLayers[0].getSource().getExtent();
                this.zoomToExtentCtrl.extent_ = extent;
                this.zoomToExtentCtrl.changed();

                // When user quits fullscreen map, the size is set to undefined
                // So we have to check this and recompute the size.
                var size = this.map.getSize();
                if (size === undefined ) {
                    this.map.updateSize();
                    size = this.map.getSize();
                }
                this.map.getView().fit(extent, this.map.getSize());
            }
        },

        _updateInfoBox: function (features) {
            var $map_info = $("#map_info");
            var $map_infobox = $("#map_infobox");
            var $map_info_open = $('#map_info_open');
            var $map_info_filter_selection = $("#map_info_filter_selection");

            var nbFeatures = features.getLength();
            $map_infobox.data('id', null);
            $map_infobox.data('ids', []);

            if (!nbFeatures) {
                $map_infobox.hide();
                this._hidePopup();
                return;
            }

            if (nbFeatures == 1) {
                var feature = features.item(0);
                var attributes = feature.get('attributes');
                $map_info.html(formatFeatureHTML(attributes, this.viewInfo.fields));
                var id = attributes['id'];
                if (id in this.ids) {
                    $map_infobox.data('id', this.ids[id]);
                }
                $map_info_open.show();
                $map_info_filter_selection.hide();
                $map_infobox.show();
            } else {
                // Several selected features
                $map_info.html(formatFeatureListHTML(features));
                var selected_ids = [];
                features.forEach(function(feature) {
                    var attributes = feature.get('attributes');
                    selected_ids.push(attributes.id);
                });
                $map_infobox.data('ids', selected_ids);
                $map_info_open.hide();
                $map_info_filter_selection.show();
                $map_infobox.show();
            }
        },

        _getCustomSelectedStyleFunction: function () {
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
                        radius: self._getBasicCircleRadius(),
                    }),
                })];
            }
        },

        _registerInteraction: function () {
            // Select interaction working on "click"

            var selectClick = new ol.interaction.Select({
                condition: ol.events.condition.click,
                style: this._getCustomSelectedStyleFunction(),
            });
            selectClick.on('select', function (e) {
                var features = e.target.getFeatures();
                this._updateInfoBox(features);

                if (features.getLength() > 0) {
                    var feature = features.item(0);
                    this._showFeaturePopup(feature);
                }
            }.bind(this));

            // Select interaction working on "pointermove"
            var selectPointerMove = new ol.interaction.Select({
                condition: ol.events.condition.pointerMove,
                style: this._getCustomSelectedStyleFunction(),
            });

            // A DragBox interaction used to select features by drawing boxes
            var dragBox = new ol.interaction.DragBox({
                condition: ol.events.condition.shiftKeyOnly,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: [0, 0, 255, 1]
                    }),
                }),
            });

            var selectedFeatures = selectClick.getFeatures();
            dragBox.on('boxend', function (e) {
                // Features that intersect the box are added to the collection of
                // selected features, and their names are displayed in the "info"
                // div
                var info = [];
                var extent = dragBox.getGeometry().getExtent();
                var layerVectors = this.map.getLayers().item(1).getLayers();
                var vectorSource;
                layerVectors.forEach(function (lv) {
                    // Enable selection only on visible layers
                    if (lv.getVisible()) {
                        vectorSource = lv.getSource();
                        vectorSource.forEachFeatureIntersectingExtent(
                            extent, function (feature) {
                                if (selectedFeatures.getArray()
                                                    .indexOf(feature) < 0) {
                                    selectedFeatures.push(feature);
                                }
                            }
                        );
                    }
                }.bind(this));
                this._updateInfoBox(selectedFeatures);
            }.bind(this));

            this.map.addInteraction(dragBox);
            this.map.addInteraction(selectClick);
            this.map.addInteraction(selectPointerMove);
        },

        // --------------------------------------------------------------------
        // Handlers
        // --------------------------------------------------------------------

        _onInfoBoxClicked: function(event) {
            if (!$(event.target).prop('special_click')) {
                var id = $(event.currentTarget).data('id');
                var ids = $(event.currentTarget).data('ids');
                if (id) {
                    this.trigger_up('open_record', {id: id, target: event.target});
                } else if (ids.length) {
                    /*
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
                    */
                    // TODO show "Geo selection" item in search view field
                    this.trigger_up('search', {
                        domains: [[['id', 'in', ids]]],
                        contexts: [],
                        groupbys: [],
                    });
                }
            }
        },
    });

    return GeoengineRenderer;
});

