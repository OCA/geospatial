odoo.define('web_view_google_map.MapRenderer', function (require) {
    'use strict';

    var BasicRenderer = require('web.BasicRenderer');
    var core = require('web.core');
    var QWeb = require('web.QWeb');
    var session = require('web.session');
    var utils = require('web.utils');
    var Widget = require('web.Widget');
    var KanbanRecord = require('web.KanbanRecord');

    var qweb = core.qweb;

    var ICON_URL = '/web_view_google_map/static/src/img/markers/';
    var MARKER_COLORS = [
        'green', 'yellow', 'blue', 'light-green',
        'red', 'magenta', 'black', 'purple', 'orange',
        'pink', 'grey', 'brown', 'cyan', 'white',
    ];

    var MAP_THEMES = {
        'default': [],
        'aubergine': [{
            "elementType": "geometry",
            "stylers": [{
                "color": "#1d2c4d",
            }],
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#8ec3b9",
            }],
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#1a3646",
            }],
        },
        {
            "featureType": "administrative.country",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#4b6878",
            }],
        },
        {
            "featureType": "administrative.land_parcel",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#64779e",
            }],
        },
        {
            "featureType": "administrative.province",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#4b6878",
            }],
        },
        {
            "featureType": "landscape.man_made",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#334e87",
            }],
        },
        {
            "featureType": "landscape.natural",
            "elementType": "geometry",
            "stylers": [{
                "color": "#023e58",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{
                "color": "#283d6a",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#6f9ba5",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#1d2c4d",
            }],
        },
        {
            "featureType": "poi.business",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry.fill",
            "stylers": [{
                "color": "#023e58",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#3C7680",
            }],
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{
                "color": "#304a7d",
            }],
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#98a5be",
            }],
        },
        {
            "featureType": "road",
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#1d2c4d",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{
                "color": "#2c6675",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#255763",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#b0d5ce",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#023e58",
            }],
        },
        {
            "featureType": "transit",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#98a5be",
            }],
        },
        {
            "featureType": "transit",
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#1d2c4d",
            }],
        },
        {
            "featureType": "transit.line",
            "elementType": "geometry.fill",
            "stylers": [{
                "color": "#283d6a",
            }],
        },
        {
            "featureType": "transit.station",
            "elementType": "geometry",
            "stylers": [{
                "color": "#3a4762",
            }],
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{
                "color": "#0e1626",
            }],
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#4e6d70",
            }],
        }],
        'night': [{
            "elementType": "geometry",
            "stylers": [{
                "color": "#242f3e",
            }],
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#746855",
            }],
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#242f3e",
            }],
        },
        {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#d59563",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "labels.text",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#d59563",
            }],
        },
        {
            "featureType": "poi.business",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{
                "color": "#263c3f",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#6b9a76",
            }],
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{
                "color": "#38414e",
            }],
        },
        {
            "featureType": "road",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#212a37",
            }],
        },
        {
            "featureType": "road",
            "elementType": "labels.icon",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#9ca5b3",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{
                "color": "#746855",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#1f2835",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#f3d19c",
            }],
        },
        {
            "featureType": "transit",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [{
                "color": "#2f3948",
            }],
        },
        {
            "featureType": "transit.station",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#d59563",
            }],
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{
                "color": "#17263c",
            }],
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#515c6d",
            }],
        },
        {
            "featureType": "water",
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#17263c",
            }],
        }],
        'dark': [{
            "elementType": "geometry",
            "stylers": [{
                "color": "#212121",
            }],
        },
        {
            "elementType": "labels.icon",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#757575",
            }],
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#212121",
            }],
        },
        {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [{
                "color": "#757575",
            }],
        },
        {
            "featureType": "administrative.country",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#9e9e9e",
            }],
        },
        {
            "featureType": "administrative.land_parcel",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#bdbdbd",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#757575",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{
                "color": "#181818",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#616161",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#1b1b1b",
            }],
        },
        {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [{
                "color": "#2c2c2c",
            }],
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#8a8a8a",
            }],
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [{
                "color": "#373737",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{
                "color": "#3c3c3c",
            }],
        },
        {
            "featureType": "road.highway.controlled_access",
            "elementType": "geometry",
            "stylers": [{
                "color": "#4e4e4e",
            }],
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#616161",
            }],
        },
        {
            "featureType": "transit",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#757575",
            }],
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{
                "color": "#000000",
            }],
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#3d3d3d",
            }],
        }],
        'retro': [{
            "elementType": "geometry",
            "stylers": [{
                "color": "#ebe3cd",
            }],
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#523735",
            }],
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#f5f1e6",
            }],
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#c9b2a6",
            }],
        },
        {
            "featureType": "administrative.land_parcel",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#dcd2be",
            }],
        },
        {
            "featureType": "administrative.land_parcel",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#ae9e90",
            }],
        },
        {
            "featureType": "landscape.natural",
            "elementType": "geometry",
            "stylers": [{
                "color": "#dfd2ae",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{
                "color": "#dfd2ae",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#93817c",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry.fill",
            "stylers": [{
                "color": "#a5b076",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#447530",
            }],
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{
                "color": "#f5f1e6",
            }],
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [{
                "color": "#fdfcf8",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{
                "color": "#f8c967",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#e9bc62",
            }],
        },
        {
            "featureType": "road.highway.controlled_access",
            "elementType": "geometry",
            "stylers": [{
                "color": "#e98d58",
            }],
        },
        {
            "featureType": "road.highway.controlled_access",
            "elementType": "geometry.stroke",
            "stylers": [{
                "color": "#db8555",
            }],
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#806b63",
            }],
        },
        {
            "featureType": "transit.line",
            "elementType": "geometry",
            "stylers": [{
                "color": "#dfd2ae",
            }],
        },
        {
            "featureType": "transit.line",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#8f7d77",
            }],
        },
        {
            "featureType": "transit.line",
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#ebe3cd",
            }],
        },
        {
            "featureType": "transit.station",
            "elementType": "geometry",
            "stylers": [{
                "color": "#dfd2ae",
            }],
        },
        {
            "featureType": "water",
            "elementType": "geometry.fill",
            "stylers": [{
                "color": "#b9d3c2",
            }],
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#92998d",
            }],
        }],
        'silver': [{
            "elementType": "geometry",
            "stylers": [{
                "color": "#f5f5f5",
            }],
        },
        {
            "elementType": "labels.icon",
            "stylers": [{
                "visibility": "off",
            }],
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#616161",
            }],
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{
                "color": "#f5f5f5",
            }],
        },
        {
            "featureType": "administrative.land_parcel",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#bdbdbd",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{
                "color": "#eeeeee",
            }],
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#757575",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{
                "color": "#e5e5e5",
            }],
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#9e9e9e",
            }],
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{
                "color": "#ffffff",
            }],
        },
        {
            "featureType": "road.arterial",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#757575",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{
                "color": "#dadada",
            }],
        },
        {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#616161",
            }],
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#9e9e9e",
            }],
        },
        {
            "featureType": "transit.line",
            "elementType": "geometry",
            "stylers": [{
                "color": "#e5e5e5",
            }],
        },
        {
            "featureType": "transit.station",
            "elementType": "geometry",
            "stylers": [{
                "color": "#eeeeee",
            }],
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{
                "color": "#c9c9c9",
            }],
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{
                "color": "#9e9e9e",
            }],
        }],
    };

    var MapRecord = KanbanRecord.extend({
        init: function (parent, state, options) {
            this._super.apply(this, arguments);
            this.fieldsInfo = state.fieldsInfo.map;
        },
    });

    function findInNode (node, predicate) {
        if (predicate(node)) {
            return node;
        }
        if (!node.children) {
            return undefined;
        }
        for (var i = 0; i < node.children.length; i++) {
            if (findInNode(node.children[i], predicate)) {
                return node.children[i];
            }
        }
    }

    function qwebAddIf (node, condition) {
        if (node.attrs[qweb.prefix + '-if']) {
            condition = _.str.sprintf("(%s) and (%s)", node.attrs[qweb.prefix + '-if'], condition);
        }
        node.attrs[qweb.prefix + '-if'] = condition;
    }

    function transformQwebTemplate (node, fields) {
        // Process modifiers
        if (node.tag && node.attrs.modifiers) {
            var modifiers = node.attrs.modifiers || {};
            if (modifiers.invisible) {
                qwebAddIf(node, _.str.sprintf("!kanban_compute_domain(%s)", JSON.stringify(modifiers.invisible)));
            }
        }
        switch (node.tag) {
            case 'button':
            case 'a':
                var type = node.attrs.type || '';
                if (_.indexOf('action,object,edit,open,delete,url,set_cover'.split(','), type) !== -1) {
                    _.each(node.attrs, function (v, k) {
                        if (_.indexOf('icon,type,name,args,string,context,states,kanban_states'.split(','), k) !== -1) {
                            node.attrs['data-' + k] = v;
                            delete(node.attrs[k]);
                        }
                    });
                    if (node.attrs['data-string']) {
                        node.attrs.title = node.attrs['data-string'];
                    }
                    if (node.tag === 'a' && node.attrs['data-type'] !== "url") {
                        node.attrs.href = '#';
                    } else {
                        node.attrs.type = 'button';
                    }

                    var action_classes = " oe_kanban_action oe_kanban_action_" + node.tag;
                    if (node.attrs['t-attf-class']) {
                        node.attrs['t-attf-class'] += action_classes;
                    } else if (node.attrs['t-att-class']) {
                        node.attrs['t-att-class'] += " + '" + action_classes + "'";
                    } else {
                        node.attrs['class'] = (node.attrs['class'] || '') + action_classes;
                    }
                }
                break;
        }
        if (node.children) {
            for (var i = 0, ii = node.children.length; i < ii; i++) {
                transformQwebTemplate(node.children[i], fields);
            }
        }
    }

    var SidebarGroup = Widget.extend({
        template: 'MapView.MapViewGroupInfo',
        init: function (parent, options) {
            this._super.apply(this, arguments);
            this.groups = options.groups;
        },
    });

    var MapRenderer = BasicRenderer.extend({
        className: 'o_map_view',
        template: 'MapView.MapView',

        /**
         * @override
         */
        init: function (parent, state, params) {
            this._super.apply(this, arguments);
            this.mapLibrary = params.mapLibrary;
            this.widgets = [];
            this.mapThemes = MAP_THEMES;

            this.qweb = new QWeb(session.debug, {
                _s: session.origin,
            }, false);
            var templates = findInNode(this.arch, function (n) {
                return n.tag === 'templates';
            });
            transformQwebTemplate(templates, state.fields);
            this.qweb.add_template(utils.json_node_to_xml(templates));
            this.recordOptions = _.extend({}, params.record_options, {
                qweb: this.qweb,
                viewType: 'map',
            });
            this.state = state;
            this.shapesCache = {};
            this._initLibraryProperties(params);
        },
        _initLibraryProperties: function (params) {
            if (this.mapLibrary === 'drawing') {
                this.drawingMode = params.drawingMode || 'shape_type';
                this.drawingPath = params.drawingPath || 'shape_paths';
                this.shapesLatLng = [];
            } else if (this.mapLibrary === 'geometry') {
                this.defaultMarkerColor = 'red';
                this.markerGroupedInfo = [];
                this.markers = [];
                this.iconUrl = '/web_view_google_map/static/src/img/markers/';
                this.fieldLat = params.fieldLat;
                this.fieldLng = params.fieldLng;
                this.markerColor = params.markerColor;
                this.markerColors = params.markerColors;
                this.groupedMarkerColors = _.extend([], params.iconColors);
            }
        },

        /**
         * @override
         */
        updateState: function (state) {
            this._setState(state);
            return this._super.apply(this, arguments);
        },

        /**
         * @override
         */
        start: function () {
            this._initMap();
            return this._super();
        },

        /**
         * Style the map
         * @private
         */
        _getMapTheme: function () {
            var self = this;
            var update_map = function (style) {
                var styledMapType = new google.maps.StyledMapType(self.mapThemes[style], {
                    name: 'Theme',
                });
                self.gmap.setOptions({
                    mapTypeControlOptions: {
                        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain', 'styled_map'],
                    },
                });
                // Associate the styled map with the MapTypeId and set it to display.
                if (self.theme === 'default') {
                    return;
                }
                self.gmap.mapTypes.set('styled_map', styledMapType);
                self.gmap.setMapTypeId('styled_map');
            };
            if (!this.theme) {
                this._rpc({
                    route: '/web/map_theme',
                }).then(function (data) {
                    if (data.theme && self.mapThemes.hasOwnProperty(data.theme)) {
                        self.theme = data.theme;
                        update_map(data.theme);
                    }
                });
            }
        },

        /**
         * Initialize map
         * @private
         */
        _initMap: function () {
            this.infoWindow = new google.maps.InfoWindow();
            this.$('.o_map_view').empty();
            this.gmap = new google.maps.Map(this.$('.o_map_view').get(0), {
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                minZoom: 3,
                maxZoom: 20,
                fullscreenControl: true,
                mapTypeControl: true,
            });
            this._getMapTheme();
            if (this.mapLibrary === 'geometry') {
                this._initMarkerCluster();
            }
            this.$right_sidebar = this.$('.o_map_right_sidebar');
        },
        _initMarkerCluster: function () {
            this.markerCluster = new MarkerClusterer(this.gmap, [], {
                imagePath: '/web_view_google_map/static/lib/markercluster/img/m',
                gridSize: 20,
                maxZoom: 17,
            });
        },

        /**
         * Compute marker color
         * @param {any} record
         * @returns string
         */
        _getIconColor: function (record) {
            if (this.markerColor) {
                return this.markerColor;
            }

            if (!this.markerColors) {
                return this.defaultMarkerColor;
            }

            var context = _.mapObject(_.extend({}, record.data, {
                uid: session.uid,
                // TODO: time, datetime, relativedelta
                current_date: moment().format('YYYY-MM-DD'),
            }), function (val, key) {
                return (val instanceof Array) ? (_.last(val) || '') : val;
            });
            for (var i = 0; i < this.markerColors.length; i++) {
                var pair = this.markerColors[i];
                var color = pair[0];
                var expression = pair[1];
                if (py.PY_isTrue(py.evaluate(expression, context))) {
                    return color;
                }
                // TODO: handle evaluation errors
            }
            return '';
        },

        /**
         * Create marker
         * @param {any} latLng: instance of google LatLng
         * @param {any} record
         * @param {String} color
         */
        _createMarker: function (latLng, record, color) {
            var options = {
                position: latLng,
                map: this.gmap,
                animation: google.maps.Animation.DROP,
                _odooRecord: record,
            };
            var fieldMarkerColor = record.data[this.markerColor];
            if (color) {
                options.icon = this.iconUrl + color.trim() + '.png';
            }
            if (fieldMarkerColor) {
                options.icon = {
                    path : 'M583 1885 c-82 -22 -147 -60 -216 -125 -103 -96 -157 -220 -157 -360 0 -135 33 -211 216 -496 57 -89 128 -211 158 -271 53 -105 135 -326 137 -368 0 -11 11 18 24 65 51 186 140 366 305 615 147 223 197 353 187 486 -17 221 -166 397 -384 454 -71 19 -201 18 -270 0z m210 -309 c71 -29 126 -127 113 -199 -13 -71 -82 -140 -153 -153 -78 -15 -178 46 -204 124 -48 144 104 287 244 228z',
                    fillColor: fieldMarkerColor.trim(),
                    fillOpacity: 0.8,
                    scale: 0.026,
                    rotation: 180,
                    strokeColor: 'black',
                    strokeWeight: 1,
                };
            }
            var marker = new google.maps.Marker(options);
            this.markers.push(marker);
            this._clusterAddMarker(marker);
        },

        /**
         * Handle Multiple Markers present at the same coordinates
         */
        _clusterAddMarker: function (marker) {
            var _position;
            var markerInClusters = this.markerCluster.getMarkers();
            var existingRecords = [];
            if (markerInClusters.length > 0) {
                markerInClusters.forEach(function (_cMarker) {
                    _position = _cMarker.getPosition();
                    if (marker.getPosition().equals(_position)) {
                        existingRecords.push(_cMarker._odooRecord);
                    }
                });
            }
            this.markerCluster.addMarker(marker);
            google.maps.event.addListener(marker, 'click', this._markerInfoWindow.bind(this, marker, existingRecords));
        },

        /**
         * Marker info window
         * @param {any} marker: instance of google marker
         * @param {any} currentRecords
         */
        _markerInfoWindow: function (marker, currentRecords) {
            var self = this;
            var _content = '';
            var markerRecords = [];

            var markerDiv = document.createElement('div');
            markerDiv.className = 'o_kanban_view o_kanban_grouped';

            var markerContent = document.createElement('div');
            markerContent.className = 'o_kanban_group';

            if (currentRecords.length > 0) {
                currentRecords.forEach(function (_record) {
                    _content = self._generateMarkerInfoWindow(_record);
                    markerRecords.push(_content);
                    _content.appendTo(markerContent);
                });
            }

            var markerIwContent = this._generateMarkerInfoWindow(marker._odooRecord);
            markerIwContent.appendTo(markerContent);

            markerDiv.appendChild(markerContent);
            this.infoWindow.setContent(markerDiv);
            this.infoWindow.open(this.gmap, marker);
        },
        _shapeInfoWindow: function (record, event) {
            var markerDiv = document.createElement('div');
            markerDiv.className = 'o_kanban_view o_kanban_grouped';

            var markerContent = document.createElement('div');
            markerContent.className = 'o_kanban_group';

            var markerIwContent = this._generateMarkerInfoWindow(record);
            markerIwContent.appendTo(markerContent);

            markerDiv.appendChild(markerContent);
            this.infoWindow.setContent(markerDiv);
            this.infoWindow.setPosition(event.latLng);
            this.infoWindow.open(this.gmap);
        },

        /**
         * @private
         */
        _generateMarkerInfoWindow: function (record) {
            var markerIw = new MapRecord(this, record, this.recordOptions);
            return markerIw;
        },

        /**
         * Render markers
         * @private
         * @param {Object} record
         */
        _renderMarkers: function () {
            var isGrouped = !!this.state.groupedBy.length;
            if (isGrouped) {
                this._renderGrouped();
            } else {
                this._renderUngrouped();
            }
        },
        _renderGrouped: function () {
            var self = this;
            var color;
            var latLng;

            _.each(this.state.data, function (record) {
                color = self._getGroupedMarkerColor();
                record.markerColor = color;
                _.each(record.data, function (rec) {
                    latLng = new google.maps.LatLng(rec.data[self.fieldLat], rec.data[self.fieldLng]);
                    self._createMarker(latLng, rec, color);
                });
                self.markerGroupedInfo.push({
                    'title': record.value || 'Undefined',
                    'count': record.count,
                    'marker': self.iconUrl + record.markerColor.trim() + '.png',
                });
            });
        },
        _renderUngrouped: function () {
            var self = this;
            var color;
            var latLng;

            _.each(this.state.data, function (record) {
                color = self._getIconColor(record);
                latLng = new google.maps.LatLng(record.data[self.fieldLat], record.data[self.fieldLng]);
                record.markerColor = color;
                self._createMarker(latLng, record, color);
            });
        },

        /**
         * Get color
         * @returns {String}
         */
        _getGroupedMarkerColor: function () {
            var color;
            if (this.groupedMarkerColors.length) {
                color = this.groupedMarkerColors.splice(0, 1)[0];
            } else {
                this.groupedMarkerColors = _.extend([], MARKER_COLORS);
                color = this.groupedMarkerColors.splice(0, 1)[0];
            }
            return color;
        },
        _drawPolygon: function (record) {
            var polygon;
            var path = record.data[this.drawingPath];
            var value = JSON.parse(path);
            if (Object.keys(value).length > 0) {
                if (this.shapesCache[record.data.id] === undefined) {
                    polygon = new google.maps.Polygon({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.85,
                        strokeWeight: 1.0,
                        fillColor: '#FF9999',
                        fillOpacity: 0.35,
                        map: this.gmap,
                    });
                    polygon.setOptions(value.options);
                    this.shapesCache[record.data.id] = polygon;
                } else {
                    polygon = this.shapesCache[record.data.id];
                    polygon.setMap(this.gmap);
                }
                this.shapesLatLng = this.shapesLatLng.concat(value.options.paths);
                polygon.addListener('click', this._shapeInfoWindow.bind(this, record));
            }
        },
        _drawCircle: function (record) {
            var circle;
            var path = record.data[this.drawingPath];
            var value = JSON.parse(path);
            if (Object.keys(value).length > 0) {
                if (this.shapesCache[record.data.id] === undefined) {
                    circle = new google.maps.Circle({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.85,
                        strokeWeight: 1.0,
                        fillColor: '#FF9999',
                        fillOpacity: 0.35,
                        map: this.gmap,
                    });
                    circle.setOptions(value.options);
                    this.shapesCache[record.data.id] = circle;
                } else {
                    circle = this.shapesCache[record.data.id];
                    circle.setMap(this.gmap);
                }
                this.shapesBounds.union(circle.getBounds());
                circle.addListener('click', this._shapeInfoWindow.bind(this, record));
            }
        },

        /**
         * Draw rectangle
         * @param {Object} record
         */
        _drawRectangle: function (record) {
            var rectangle;
            var path = record.data[this.drawingPath];
            var value = JSON.parse(path);
            if (Object.keys(value).length > 0) {
                var shapeOptions = value.options;
                if (this.shapesCache[record.data.id] === undefined) {
                    rectangle = new google.maps.Rectangle({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.85,
                        strokeWeight: 1.0,
                        fillColor: '#FF9999',
                        fillOpacity: 0.35,
                        map: this.gmap,
                    });
                    rectangle.setOptions(shapeOptions);
                    this.shapesCache[record.data.id] = rectangle;
                } else {
                    rectangle = this.shapesCache[record.data.id];
                    rectangle.setMap(this.gmap);
                }

                this.shapesBounds.union(rectangle.getBounds());
                rectangle.addListener('click', this._shapeInfoWindow.bind(this, record));
            }
        },

        /**
         * Draw shape into the map
         */
        _renderShapes: function () {
            var self = this;
            var shapesToKeep = [];
            this.shapesBounds = new google.maps.LatLngBounds();
            _.each(this.state.data, function (record) {
                if (record.data.hasOwnProperty('id')) {
                    shapesToKeep.push((record.data.id).toString());
                }
                if (record.data[self.drawingMode] === 'polygon') {
                    self._drawPolygon(record);
                } else if (record.data[self.drawingMode] === 'rectangle') {
                    self._drawRectangle(record);
                } else if (record.data[self.drawingMode] === 'circle') {
                    self._drawCircle(record);
                }
            });
            this._cleanShapesInCache(shapesToKeep);
        },

        /**
         * @private
         * @param {Array} shapesToKeep contains list of id
         * Remove shapes from the maps without deleting the shape
         * will keep those shapes in cache
         */
        _cleanShapesInCache: function (shapesToKeep) {
            _.each(this.shapesCache, function (shape, id) {
                if (shapesToKeep.indexOf(id) === -1) {
                    shape.setMap(null);
                }
            });
        },

        /**
         * @override
         */
        _renderView: function () {
            var self = this;
            if (this.mapLibrary === 'geometry') {
                this.markerGroupedInfo.length = 0;
                this._clearMarkerClusters();
                this._renderMarkers();
                this._clusterMarkers();
                return this._super.apply(this, arguments)
                    .then(self._renderSidebarGroup.bind(self))
                    .then(self.mapGeometryCentered.bind(self));
            } else if (this.mapLibrary === 'drawing') {
                this.shapesLatLng.length = 0;
                this._renderShapes();
                return this._super.apply(this, arguments).then(this.mapShapesCentered.bind(this));
            }
            return this._super.apply(this, arguments);
        },

        /**
         * Cluster markers
         * @private
         */
        _clusterMarkers: function () {
            this.markerCluster.addMarkers(this.markers);
        },

        /**
         * Centering map
         */
        mapShapesCentered: function () {
            var mapBounds = new google.maps.LatLngBounds();
            if (!this.shapesBounds.isEmpty()) {
                mapBounds.union(this.shapesBounds);
            }
            _.each(this.shapesLatLng, function (latLng) {
                mapBounds.extend(latLng);
            });
            this.gmap.fitBounds(mapBounds);
        },

        /**
         * Centering map
         */
        mapGeometryCentered: function () {
            var self = this;
            var mapBounds = new google.maps.LatLngBounds();

            _.each(this.markers, function (marker) {
                mapBounds.extend(marker.getPosition());
            });
            this.gmap.fitBounds(mapBounds);

            google.maps.event.addListenerOnce(this.gmap, 'idle', function () {
                google.maps.event.trigger(self.gmap, 'resize');
                if (self.gmap.getZoom() > 17) {
                    self.gmap.setZoom(17);
                }
            });
        },

        /**
         * Clear marker clusterer and list markers
         * @private
         */
        _clearMarkerClusters: function () {
            this.markerCluster.clearMarkers();
            this.markers = [];
        },

        /**
         * Render a sidebar for grouped markers info
         * @private
         */
        _renderSidebarGroup: function () {
            if (this.markerGroupedInfo.length > 0) {
                this.$right_sidebar.empty().removeClass('closed').addClass('open');
                var groupInfo = new SidebarGroup(this, {
                    'groups': this.markerGroupedInfo,
                });
                groupInfo.appendTo(this.$right_sidebar);
            } else {
                this.$right_sidebar.empty();
                if (!this.$right_sidebar.hasClass('closed')) {
                    this.$right_sidebar.removeClass('open').addClass('closed');
                }
            }
        },

        /**
         * Sets the current state and updates some internal attributes accordingly.
         *
         * @private
         * @param {Object} state
         */
        _setState: function (state) {
            this.state = state;

            var groupByFieldAttrs = state.fields[state.groupedBy[0]];
            var groupByFieldInfo = state.fieldsInfo.map[state.groupedBy[0]];
            // Deactivate the drag'n'drop if the groupedBy field:
            // - is a date or datetime since we group by month or
            // - is readonly (on the field attrs or in the view)
            var draggable = false;
            if (groupByFieldAttrs) {
                if (groupByFieldAttrs.type === "date" || groupByFieldAttrs.type === "datetime") {
                    draggable = false;
                } else if (groupByFieldAttrs.readonly !== undefined) {
                    draggable = !groupByFieldAttrs.readonly;
                }
            }
            if (groupByFieldInfo) {
                if (draggable && groupByFieldInfo.readonly !== undefined) {
                    draggable = !groupByFieldInfo.readonly;
                }
            }
            this.groupedByM2O = groupByFieldAttrs && (groupByFieldAttrs.type === 'many2one');
        },
    });

    return MapRenderer;

});
