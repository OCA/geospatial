/* eslint-disable */
odoo.define("web_view_google_map.GoogleMapView", function (require) {
    "use strict";

    const BasicView = require("web.BasicView");
    const core = require("web.core");
    const pyUtils = require("web.py_utils");

    const GoogleMapModel = require("web_view_google_map.GoogleMapModel");
    const GoogleMapRenderer = require("web_view_google_map.GoogleMapRenderer")
        .GoogleMapRenderer;
    const GoogleMapController = require("web_view_google_map.GoogleMapController");

    const _lt = core._lt;

    const GoogleMapView = BasicView.extend({
        accesskey: "m",
        display_name: _lt("Google Map"),
        icon: "fa-map-o",
        config: _.extend({}, BasicView.prototype.config, {
            Model: GoogleMapModel,
            Renderer: GoogleMapRenderer,
            Controller: GoogleMapController,
        }),
        viewType: "google_map",
        mobile_friendly: true,
        _map_mode: function () {
            return ["geometry"];
        },
        init: function (viewInfo, params) {
            this._super.apply(this, arguments);

            const arch = this.arch;
            const attrs = arch.attrs;
            const activeActions = this.controllerParams.activeActions;

            this.loadParams.limit = this.loadParams.limit || 80;
            this.loadParams.type = "list";

            const modes = this._map_mode();
            const defaultMode = "geometry";
            const map_mode = attrs.mode
                ? modes.indexOf(attrs.mode) > -1
                    ? attrs.mode
                    : defaultMode
                : defaultMode;
            this.rendererParams.arch = arch;
            this.rendererParams.map_mode = map_mode;
            this.rendererParams.record_options = {
                editable: activeActions.edit,
                deletable: activeActions.delete,
                read_only_mode: params.readOnlyMode || true,
            };
            this.controllerParams.mode =
                arch.attrs.editable && !params.readonly ? "edit" : "readonly";
            this.controllerParams.hasButtons = true;
            if (attrs.options && !_.isObject(attrs.options)) {
                attrs.options = attrs.options ? pyUtils.py_eval(attrs.options) : {};
            }
            const func_name = "set_property_" + map_mode;
            this[func_name].call(this, attrs);
        },
        set_property_geometry: function (attrs) {
            const colors = this._setMarkersColor(attrs.colors);
            this.rendererParams.markerColor = attrs.color;
            this.rendererParams.markerColors = colors;
            this.rendererParams.fieldLat = attrs.lat;
            this.rendererParams.fieldLng = attrs.lng;
            this._setClusterParams(attrs);
        },
        /* eslint-disable */
        _setMarkersColor: function (colors) {
            if (!colors) {
                return false;
            }
            let pair = null;
            let color = null;
            let expr = null;
            return _(colors.split(";"))
                .chain()
                .compact()
                .map(function (color_pair) {
                    pair = color_pair.split(":");
                    color = pair[0];
                    expr = pair[1];
                    return [color, py.parse(py.tokenize(expr)), expr];
                })
                .value();
        },
        /* eslint-enable */
        _setClusterParams: function (attrs) {
            const optionClusterConfig = {};
            const defaultMarkerClusterConfig = this._getDefaultClusterMarkerConfig();
            if (attrs.options) {
                const configMapper = this._getClusterMarkerConfigMapper();
                for (const key in attrs.options) {
                    const conf = configMapper[key];
                    if (conf !== undefined) {
                        optionClusterConfig[conf] = attrs.options[key];
                    }
                }
            }
            this.rendererParams.markerClusterConfig = _.defaults(
                optionClusterConfig,
                defaultMarkerClusterConfig
            );
        },
        _getClusterMarkerConfigMapper: function () {
            // More options can be check on this link: https://googlemaps.github.io/v3-utility-library/interfaces/_google_markerclustererplus.markerclustereroptions.html
            // override this function and the `_getDefaultClusterMarkerConfig` if you want cover more
            return {
                cluster_grid_size: "gridSize",
                cluster_max_zoom_level: "maxZoom",
                cluster_zoom_on_click: "zoomOnClick",
                cluster_image_path: "imagePath",
            };
        },
        _getDefaultClusterMarkerConfig: function () {
            return {
                gridSize: 40,
                maxZoom: 7,
                zoomOnClick: true,
                imagePath: "/web_view_google_map/static/lib/markerclusterer/img/m",
            };
        },
    });

    return GoogleMapView;
});
