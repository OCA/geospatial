/*---------------------------------------------------------
 * OpenERP base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Vaucher 2015-2016 Camptocamp SA
 * License in __openerp__.py at root level of the module
 *---------------------------------------------------------
*/
odoo.define('base_geoengine.geoengine_widgets', function (require) {

var core = require('web.core');
var data = require('web.data');
var GeoengineView = require('base_geoengine.GeoengineView');
var common = require('web.form_common');
var geoengine_common = require('base_geoengine.geoengine_common');

var FieldGeoEngineEditMap = common.AbstractField.extend(geoengine_common.GeoengineMixin, {
    template: 'FieldGeoEngineEditMap',

    geo_type: null,
    map: null,
    default_extent: null,
    format: null,
    force_readonly: null,
    vector_layer: null,
    raster_layers: null,
    source: null,
    features: null,
    draw_control: null,
    modify_control: null,
    tab_listener_installed: false,

    create_vector_layer: function(self) {
        this.features = new ol.Collection();
        this.source = new ol.source.Vector({features: this.features});
        return new ol.layer.Vector({
            source: this.source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: '#ee9900',
                    opacity: 0.7,
                }),
                stroke: new ol.style.Stroke({
                    color: '#ee9900',
                    width: 3,
                    opacity: 1,
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                }),
            })
        });
    },

    create_layers: function(self, field_infos) {
        this.vector_layer = this.create_vector_layer();
        this.raster_layers = this.createBackgroundLayers([field_infos.edit_raster]);
        this.raster_layers[0].isBaseLayer = true;
    },

    add_tab_listener: function() {
        tab_href = this.$el.closest('div[role="tabpanel"]')
        if (tab_href.length == 0) {
            return;
        }
        $('a[href="#' + tab_href[0].id + '"]').on('shown.bs.tab', function(e) {
            this.render_map();
            return;
        }.bind(this));
    },

    start: function() {
        this._super.apply(this, arguments);
        if (this.map) {
            return;
        }
        this.view.on("change:actual_mode", this, this.on_mode_change);
        var self = this;
        // add a listener on parent tab if it exists in order to refresh geoengine view
        // we need to trigger it on DOM update for changes from view to edit mode
        core.bus.on('DOM_updated', self.view.ViewManager.is_in_DOM, function () {
            if (!self.tab_listener_installed) {
                self.add_tab_listener();
                self.tab_listener_installed = true;
            }
        });
        // When opening a popup form DOM update isn't triggered and there is no change from view to
        // edit mode thus we install listener anyway
        if (this.view.ViewManager.$modal) {
            if (!self.tab_listener_installed) {
                self.add_tab_listener();
                self.tab_listener_installed = true;
            }
        }
        // We blacklist all other fields in order to avoid calling get_value inside the build_context on field widget which aren't started yet
        var blacklist = this.view.fields_order.slice();
        delete blacklist[this.name];
        var rdataset = new data.DataSetStatic(self, self.view.model, self.build_context(blacklist));
        rdataset.call("get_edit_info_for_geo_column", [self.name, rdataset.get_context()], false, 0).then(function(result) {
            self.create_layers(self, result);
            self.geo_type = result.geo_type;
            self.projection = result.projection;
            self.default_extent = result.default_extent;
            self.default_zoom = result.default_zoom;
            self.restricted_extent = result.restricted_extent;
            self.srid = result.srid;
            if (self.$el.is(':visible')){
                self.render_map();
            }
        });
    },

    set_value: function(value, zoom) {
        var map_view = null;

        zoom = (typeof zoom === 'undefined') ? true : zoom;
        this._super.apply(this, arguments);
        this.value = value;

        if (this.map) {

            var ft = new ol.Feature({
                geometry: new ol.format.GeoJSON().readGeometry(value),
                labelPoint:  new ol.format.GeoJSON().readGeometry(value),
            });
            this.source.clear();
            this.source.addFeature(ft);
            if (value){

                if (this.source){
                    var extent = this.source.getExtent();
                    if (zoom && extent != [Infinity, Infinity, -Infinity, -Infinity]) {
                        map_view = this.map.getView();
                        if (map_view){
                            map_view.fit(extent, this.map.getSize(), {
                                maxZoom:15
                            });
                        }
                    }
                }
            }
            else {
                map_view = this.map.getView();
                // default_extent
                if (map_view){
                    map_view.fit(this.default_extent.split(", "), this.map.getSize(), {
                        maxZoom:5
                    });
                }
            }
        }
    },

    on_ui_change: function() {
        value = null;
        if (this._geometry) {
            value = this.format.writeGeometry(this._geometry);
        }
        this.set_value(value, false);
    },

    validate: function() {
        this.invalid = false;
    },

    on_mode_change: function() {
        if (this.$el.is(':visible')){
            this.render_map();
        }
        this.$el.toggle(!this.invisible);
    },

    setup_controls: function() {
        /* Add a draw interaction depending on geo_type of the field
         * plus adds a modify interaction to be able to change line
         * and polygons.
         * As modify needs to get pointer position on map it requires
         * the map to be rendered before being created
         */
        var self = this;
        var handler = null;
        if (this.geo_type == 'POLYGON') {
            handler = "Polygon";
        } else if (this.geo_type == 'MULTIPOLYGON') {
            handler = "MultiPolygon";
        } else if (this.geo_type == 'LINESTRING') {
            handler = "LineString";
        } else if (this.geo_type == 'MULTILINESTRING') {
            handler = "MultiLineString";
        } else if (this.geo_type == 'POINT') {
            handler = "Point";
        } else if (this.geo_type == 'MULTIPOINT') {
            handler = "MultiPoint";
        } else {
            // FIXME: unsupported geo type
        }

        this.draw_control = new ol.interaction.Draw({
            source: this.source,
            type: /** @type {ol.geom.GeometryType} */ (handler)//,
        });
        this.map.addInteraction(this.draw_control);
        var onchange_geom = function(e){
            // Trigger onchanges when drawing is done
            if (e.type == 'drawend') {
                self._geometry = e.feature.getGeometry();
            } else { // modifyend
                self._geometry = e.features.item(0).getGeometry();
            }
            self.on_ui_change();
        };
        this.draw_control.on('drawend', onchange_geom);

        this.features = this.source.getFeaturesCollection();
        this.modify_control = new ol.interaction.Modify({
            features: this.features,
            // the SHIFT key must be pressed to delete vertices, so
            // that new vertices can be drawn at the same position
            // of existing vertices
            deleteCondition: function(event) {
              return ol.events.condition.shiftKeyOnly(event) &&
                  ol.events.condition.singleClick(event);
            }
        });
        this.map.addInteraction(this.modify_control);
        this.modify_control.on('modifyend', onchange_geom);

        ClearMapControl = function(opt_options) {
            var options = opt_options || {};
            var button = document.createElement('button');
            button.innerHTML = '<i class="fa fa-trash"/>';
            button.addEventListener('click', function() {
                self.source.clear();
                self._geometry = null;
                self.on_ui_change();
            });
            var element = document.createElement('div');
            element.className = 'ol-clear ol-unselectable ol-control';
            element.appendChild(button);

            ol.control.Control.call(this, {
                element: element,
                target: options.target,
            });
        };
        ol.inherits(ClearMapControl, ol.control.Control);
        this.clearmap_control = new ClearMapControl();

        this.map.addControl(this.clearmap_control);
    },

    render_map: function() {
        var self = this;
        if (!this.map) {
            this.map = new ol.Map({
                theme: null,
                layers: this.raster_layers,
                target: this.$el[0],
                view: new ol.View({
                    center: [0, 0],
                    zoom: 5
                }),
            });
            // TODO restricted extent is not implemented yet in OL3
            // see: https://github.com/openlayers/ol3/pull/2777
            // if (this.restricted_extent) {
            //     this.map.restrictedExtent = OpenLayers.Bounds.fromString(this.restricted_extent).transform(this.projection, this.map.getProjection());
            // }
            this.map.addLayer(this.vector_layer);

            this.format = new ol.format.GeoJSON({
                internalProjection: this.map.getView().getProjection(),
                externalProjection: 'EPSG:' + this.srid
            });

            this.map.render(this.$el[0]);
            $(document).trigger('FieldGeoEngineEditMap:ready', [this.map]);
            this.set_value(this.value);
            this.setup_controls();
        }
        var edit_active = (!this.get("effective_readonly") && !this.force_readonly);
        this.draw_control.setActive(edit_active);
        this.modify_control.setActive(edit_active);
        this.clearmap_control.element.children[0].disabled = !edit_active;
    },
});

var FieldGeoEngineEditMapReadonly = FieldGeoEngineEditMap.extend({
    init: function(view, node) {
        this.force_readonly = true;
        this._super(view, node);
     }
});

//-----------------------------------------------------------------------
var FieldGeoPointXY = common.AbstractField.extend({
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

var FieldGeoPointXYReadonly = FieldGeoPointXY.extend({
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

var FieldGeoRect = common.AbstractField.extend({
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

var FieldGeoRectReadonly = FieldGeoRect.extend({
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

core.form_widget_registry
    .add('geo_edit_map', FieldGeoEngineEditMap)
    .add('geo_edit_map_readonly', FieldGeoEngineEditMapReadonly)
    .add('geo_point_xy', FieldGeoPointXY)
    .add('geo_point_xy', FieldGeoPointXYReadonly)
    .add('geo_rect', FieldGeoRect)
    .add('geo_rect', FieldGeoRectReadonly);

return {
    FieldGeoEngineEditMap: FieldGeoEngineEditMap,
    FieldGeoEngineEditMapReadonly: FieldGeoEngineEditMapReadonly,
    FieldGeoPointXY: FieldGeoPointXY,
    FieldGeoPointXYReadonly: FieldGeoPointXYReadonly,
    FieldGeoRect: FieldGeoRect,
    FieldGeoRectReadonly: FieldGeoRectReadonly,
};

});
