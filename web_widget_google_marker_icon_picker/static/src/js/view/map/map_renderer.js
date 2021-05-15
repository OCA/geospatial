odoo.define("web_widget_google_marker_icon_picker.MapRenderer", function (require) {
    "use strict";

    var MapRenderer = require("web_view_google_map.GoogleMapRenderer")
        .GoogleMapRenderer;

    MapRenderer.include({
        _initLibraryProperties: function (params) {
            this._super(params);
            if (this.mapLibrary === "geometry") {
                this.iconUrl =
                    "/web_widget_google_marker_icon_picker/static/src/img/markers/";
            }
        },
    });
});
