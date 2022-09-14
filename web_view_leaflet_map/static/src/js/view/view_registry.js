odoo.define('web_view_leaflet_map.view_registry', function (require) {
    "use strict";

    var MapView = require('web_view_leaflet_map.MapView');
    var view_registry = require('web.view_registry');

    view_registry.add('leaflet_map', MapView);

});
