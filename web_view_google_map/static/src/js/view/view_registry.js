odoo.define("web_view_google_map.view_registry", function (require) {
    "use strict";

    var MapView = require("web_view_google_map.GoogleMapView");
    var view_registry = require("web.view_registry");

    view_registry.add("google_map", MapView);
});
