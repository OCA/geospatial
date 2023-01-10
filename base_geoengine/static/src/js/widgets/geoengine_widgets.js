/* eslint-disable no-unused-vars */
/* ---------------------------------------------------------
 * Odoo base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Vaucher 2015-2016 Camptocamp SA
 * License in __manifest__.py at root level of the module
 * ---------------------------------------------------------
 */
odoo.define("base_geoengine.geoengine_widgets", function (require) {
    "use strict";

    var core = require("web.core");
    var AbstractField = require("web.AbstractField");
    var geoengine_common = require("base_geoengine.geoengine_common");
    var BackgroundLayers = require("base_geoengine.BackgroundLayers");
    var registry = require("web.field_registry");

    var FieldGeoEngineEditMap = AbstractField.extend(geoengine_common.GeoengineMixin, {
        // eslint-disable-line max-len
        template: "FieldGeoEngineEditMap",

        geoType: null,
        map: null,
        defaultExtent: null,
        format: null,
        vectorLayer: null,
        rasterLayers: null,
        source: null,
        features: null,
        drawControl: null,
        modifyControl: null,
        tabListenerInstalled: false,
        bgLayers: new BackgroundLayers(),

        // --------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------

        /**
         * @override
         */
        start: function () {
            var def = this._super();

            // Add a listener on parent tab if it exists in order to refresh
            // geoengine view we need to trigger it on DOM update for changes
            // from view to edit mode.
            core.bus.on(
                "DOM_updated",
                this,
                function () {
                    this._addTabListener();
                }.bind(this)
            );

            return def;
        },

        // FIXME still used?
        validate: function () {
            this.invalid = false;
        },

        // --------------------------------------------------------------------
        // Private
        // --------------------------------------------------------------------

        _createVectorLayer: function () {
            this.features = new ol.Collection();
            this.source = new ol.source.Vector({features: this.features});
            return new ol.layer.Vector({
                source: this.source,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: "#ee9900",
                        opacity: 0.7,
                    }),
                    stroke: new ol.style.Stroke({
                        color: "#ee9900",
                        width: 3,
                        opacity: 1,
                    }),
                    image: new ol.style.Circle({
                        radius: 7,
                        fill: new ol.style.Fill({
                            color: "#ffcc33",
                        }),
                    }),
                }),
            });
        },

        _createLayers: function (field_infos) {
            this.vectorLayer = this._createVectorLayer();
            this.rasterLayers = this.bgLayers.create([field_infos.edit_raster]);
            if (this.rasterLayers.length) {
                this.rasterLayers[0].isBaseLayer = true;
            }
        },

        _addTabListener: function () {
            if (this.tabListenerInstalled) {
                return;
            }
            var tab = this.$el.closest("div.tab-pane");
            if (!tab.length) {
                return;
            }
            var tab_link = $('a[href="#' + tab[0].id + '"]');
            if (!tab_link.length) {
                return;
            }
            tab_link.on(
                "shown.bs.tab",
                function (e) {
                    this._render();
                }.bind(this)
            );
            this.tabListenerInstalled = true;
        },

        _parseValue: function (value) {
            return value;
        },

        _updateMapEmpty: function () {
            var map_view = this.map.getView();
            // Default extent
            if (map_view) {
                var extent = this.defaultExtent.replace(/\s/g, "").split(",");
                extent = extent.map((coord) => Number(coord));
                map_view.fit(extent, {maxZoom: this.defaultZoom || 5});
            }
        },

        _updateMapZoom: function (zoom) {
            var map_zoom = typeof zoom === "undefined" ? true : zoom;

            if (this.source) {
                var extent = this.source.getExtent();
                var infinite_extent = [Infinity, Infinity, -Infinity, -Infinity];
                if (map_zoom && extent !== infinite_extent) {
                    var map_view = this.map.getView();
                    if (map_view) {
                        map_view.fit(extent, {maxZoom: 15});
                    }
                }
            }
        },

        _setValue: function (value, zoom) {
            this._super(value);
            this.value = value;

            if (this.map) {
                var ft = new ol.Feature({
                    geometry: new ol.format.GeoJSON().readGeometry(value),
                    labelPoint: new ol.format.GeoJSON().readGeometry(value),
                });
                this.source.clear();
                this.source.addFeature(ft);
                if (value) {
                    this._updateMapZoom(zoom);
                } else {
                    this._updateMapEmpty();
                }
            }
        },

        _isTabVisible: function () {
            var tab = this.$el.closest("div.tab-pane");
            if (!tab.length) {
                return false;
            }
            return tab.is(":visible");
        },

        _onUIChange: function () {
            var value = null;
            if (this._geometry) {
                value = this.format.writeGeometry(this._geometry);
            }
            this._setValue(value, false);
        },

        _setupControls: function () {
            /* Add a draw interaction depending on geoType of the field
             * plus adds a modify interaction to be able to change line
             * and polygons.
             * As modify needs to get pointer position on map it requires
             * the map to be rendered before being created
             */
            var handler = null;
            if (this.geoType === "POLYGON") {
                handler = "Polygon";
            } else if (this.geoType === "MULTIPOLYGON") {
                handler = "MultiPolygon";
            } else if (this.geoType === "LINESTRING") {
                handler = "LineString";
            } else if (this.geoType === "MULTILINESTRING") {
                handler = "MultiLineString";
            } else if (this.geoType === "POINT") {
                handler = "Point";
            } else if (this.geoType === "MULTIPOINT") {
                handler = "MultiPoint";
            } else {
                // FIXME: unsupported geo type
            }

            var drawControl = function (options) {
                ol.interaction.Draw.call(this, options);
            };
            ol.inherits(drawControl, ol.interaction.Draw);
            drawControl.prototype.finishDrawing = function () {
                this.source_.clear();
                ol.interaction.Draw.prototype.finishDrawing.call(this);
            };

            this.drawControl = new drawControl({
                source: this.source,
                type: handler,
            });
            this.map.addInteraction(this.drawControl);
            var onchange_geom = function (e) {
                // Trigger onchanges when drawing is done
                if (e.type === "drawend") {
                    this._geometry = e.feature.getGeometry();
                } else {
                    // Modify end
                    this._geometry = e.features.item(0).getGeometry();
                }
                this._onUIChange();
            }.bind(this);
            this.drawControl.on("drawend", onchange_geom);

            this.features = this.source.getFeaturesCollection();
            this.modifyControl = new ol.interaction.Modify({
                features: this.features,
                // The SHIFT key must be pressed to delete vertices, so
                // that new vertices can be drawn at the same position
                // of existing vertices
                deleteCondition: function (event) {
                    return (
                        ol.events.condition.shiftKeyOnly(event) &&
                        ol.events.condition.singleClick(event)
                    );
                },
            });
            this.map.addInteraction(this.modifyControl);
            this.modifyControl.on("modifyend", onchange_geom);

            var self = this;
            var ClearMapControl = function (opt_options) {
                var options = opt_options || {};
                var button = document.createElement("button");
                button.innerHTML = '<i class="fa fa-trash"/>';
                button.addEventListener("click", function () {
                    self.source.clear();
                    self._geometry = null;
                    self._onUIChange();
                });
                var element = document.createElement("div");
                element.className = "ol-clear ol-unselectable ol-control";
                element.appendChild(button);

                ol.control.Control.call(this, {
                    element: element,
                    target: options.target,
                });
            };
            ol.inherits(ClearMapControl, ol.control.Control);
            this.clearmapControl = new ClearMapControl();
            this.map.addControl(this.clearmapControl);
        },

        _renderMap: function () {
            if (!this.map) {
                var $el = this.$el[0];
                $($el).css({width: "100%", height: "100%"});
                this.map = new ol.Map({
                    layers: this.rasterLayers,
                    target: $el,
                    view: new ol.View({
                        center: [0, 0],
                        zoom: 5,
                    }),
                });
                this.map.addLayer(this.vectorLayer);

                this.format = new ol.format.GeoJSON({
                    internalProjection: this.map.getView().getProjection(),
                    externalProjection: "EPSG:" + this.srid,
                });

                $(document).trigger("FieldGeoEngineEditMap:ready", [this.map]);
                this._setValue(this.value);

                if (this.mode !== "readonly" && !this.get("effective_readonly")) {
                    this._setupControls();
                    this.drawControl.setActive(true);
                    this.modifyControl.setActive(true);
                    this.clearmapControl.element.children[0].disabled = false;
                }
            }
        },

        _render: function () {
            this._rpc({
                model: this.model,
                method: "get_edit_info_for_geo_column",
                args: [this.name],
            }).then(
                function (result) {
                    this._createLayers(result);
                    this.geoType = result.geo_type;
                    this.projection = result.projection;
                    this.defaultExtent = result.default_extent;
                    this.defaultZoom = result.default_zoom;
                    this.restrictedExtent = result.restricted_extent;
                    this.srid = result.srid;
                    if (this.$el.is(":visible") || this._isTabVisible()) {
                        this._renderMap();
                    }
                }.bind(this)
            );
        },
    });

    // TODO migrate the following widgets

    var FieldGeoPointXY = AbstractField.extend({
        template: "FieldGeoPointXY",

        start: function () {
            this._super.apply(this, arguments);
            this.$input = this.$el.find("input");
            this.$input.change(this._onUIChange);
            this.setupFocus(this.$input);
        },

        get_coords: function () {
            /* Get coordinates and check it has the right format
             *
             * @return [x, y]
             */
            var x = openerp.web.parse_value(this.$input.eq(0).val(), {
                type: "float",
            });
            var y = openerp.web.parse_value(this.$input.eq(1).val(), {
                type: "float",
            });
            return [x, y];
        },

        make_GeoJSON: function (coords) {
            return {type: "Point", coordinates: coords};
        },

        _setValue: function (value) {
            this._super.apply(this, arguments);

            if (value) {
                var geo_obj = JSON.parse(value);
                this.$input.eq(0).val(geo_obj.coordinates[0]);
                this.$input.eq(1).val(geo_obj.coordinates[1]);
            } else {
                this.$input.val("");
            }
        },

        _onUIChange: function () {
            var coords = this.get_coords();
            if (coords[0] && coords[1]) {
                var json = this.make_GeoJSON(coords);
                this.value = JSON.stringify(json);
            } else {
                this.value = false;
            }
        },

        validate: function () {
            this.invalid = false;
            try {
                // Get coords to check if floats
                var coords = this.get_coords();

                // Make sure the two coordinates are set or None
                this.invalid =
                    (this.required && (coords[0] === 0 || coords[1] === 0)) ||
                    (coords[0] === false && coords[1] !== false) ||
                    (coords[0] !== false && coords[1] === false);
            } catch (e) {
                this.invalid = true;
            }
        },

        update_dom: function () {
            this._super.apply(this, arguments);
            this.set_readonly(this.readonly);
        },

        set_readonly: function () {
            this.$input.prop("readonly", this.readonly);
        },
    });

    var FieldGeoPointXYReadonly = FieldGeoPointXY.extend({
        template: "FieldGeoPointXY.readonly",

        _setValue: function (value) {
            this._super.apply(this, arguments);
            var show_value = "";
            if (value) {
                var geo_obj = JSON.parse(value);
                show_value =
                    "(" + geo_obj.coordinates[0] + ", " + geo_obj.coordinates[1] + ")";
            }
            this.$el.find("div").text(show_value);
            return show_value;
        },

        validate: function () {
            this.invalid = false;
        },
    });

    var FieldGeoRect = AbstractField.extend({
        template: "FieldGeoRect",

        start: function () {
            this._super.apply(this, arguments);
            this.$input = this.$el.find("input");
            this.$input.change(this._onUIChange);
            this.setupFocus(this.$input);
        },

        get_coords: function () {
            /* Get coordinates in the input fields
             *
             * @return [[x1, y1],[x2, y2]]
             */
            var x1 = openerp.web.parse_value(this.$input.eq(0).val(), {
                type: "float",
            });
            var y1 = openerp.web.parse_value(this.$input.eq(1).val(), {
                type: "float",
            });
            var x2 = openerp.web.parse_value(this.$input.eq(2).val(), {
                type: "float",
            });
            var y2 = openerp.web.parse_value(this.$input.eq(3).val(), {
                type: "float",
            });

            return [
                [x1, y1],
                [x2, y2],
            ];
        },

        make_GeoJSON: function (coords) {
            var p1 = coords[0];
            var p2 = [coords[0][0], coords[1][1]];
            var p3 = coords[1];
            var p4 = [coords[1][0], coords[0][1]];
            // Create a loop in clockwise
            var points = [[p1, p2, p3, p4, p1]];
            return {type: "Polygon", coordinates: points};
        },

        _setValue: function (value) {
            this._super.apply(this, arguments);

            if (value) {
                var geo_obj = JSON.parse(value);
                this.$input.eq(0).val(geo_obj.coordinates[0][0][0]);
                this.$input.eq(1).val(geo_obj.coordinates[0][0][1]);
                this.$input.eq(2).val(geo_obj.coordinates[0][2][0]);
                this.$input.eq(3).val(geo_obj.coordinates[0][2][1]);
            } else {
                this.$input.val("");
            }
        },

        correct_bounds: function (coords) {
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

            return [
                [minx, miny],
                [maxx, maxy],
            ];
        },

        _onUIChange: function () {
            var coords = this.get_coords();
            if (this.all_are_set(coords)) {
                coords = this.correct_bounds(coords);
                var json = this.make_GeoJSON(coords);
                this.value = JSON.stringify(json);
            } else {
                this.value = false;
            }
        },

        all_are_set: function (coords) {
            return (
                coords[0][0] !== false &&
                coords[0][1] !== false &&
                coords[1][0] !== false &&
                coords[1][1] !== false
            );
        },

        none_are_set: function (coords) {
            return (
                coords[0][0] === false &&
                coords[0][1] === false &&
                coords[1][0] === false &&
                coords[1][1] === false
            );
        },

        validate: function () {
            this.invalid = false;
            try {
                // Get coords to check if floats
                var coords = this.get_coords();

                // Make sure all the coordinates are set
                // if not None or if required
                this.invalid =
                    (this.required || !this.none_are_set(coords)) &&
                    !this.all_are_set(coords);
            } catch (e) {
                this.invalid = true;
            }
        },

        update_dom: function () {
            this._super.apply(this, arguments);
            this.set_readonly(this.readonly);
        },

        set_readonly: function () {
            this.$input.prop("readonly", this.readonly);
        },
    });

    var FieldGeoRectReadonly = FieldGeoRect.extend({
        template: "FieldGeoRect.readonly",

        _setValue: function (value) {
            this._super.apply(this, arguments);
            var show_value = "";
            if (value) {
                var geo_obj = JSON.parse(value);
                show_value =
                    "(" +
                    geo_obj.coordinates[0][0][0] +
                    ", " +
                    geo_obj.coordinates[0][0][1] +
                    "), " +
                    "(" +
                    geo_obj.coordinates[0][2][0] +
                    ", " +
                    geo_obj.coordinates[0][2][1] +
                    ")";
            }
            this.$el.find("div").text(show_value);
            return show_value;
        },

        validate: function () {
            this.invalid = false;
        },
    });

    registry.add("geo_edit_map", FieldGeoEngineEditMap);
    //    .add('geo_point_xy', FieldGeoPointXY)
    //    .add('geo_point_xy', FieldGeoPointXYReadonly)
    //    .add('geo_rect', FieldGeoRect)
    //    .add('geo_rect', FieldGeoRectReadonly);

    return {
        FieldGeoEngineEditMap: FieldGeoEngineEditMap,
        //    FieldGeoPointXY: FieldGeoPointXY,
        //    FieldGeoPointXYReadonly: FieldGeoPointXYReadonly,
        //    FieldGeoRect: FieldGeoRect,
        //    FieldGeoRectReadonly: FieldGeoRectReadonly,
    };
});
