/* ---------------------------------------------------------
 * Odoo base_geoengine
 * Author Yannick Vaucher Copyright 2018 Camptocamp SA
 * License in __manifest__.py at root level of the module
 * ---------------------------------------------------------
 */
odoo.define("base_geoengine._view_registry", function (require) {
    "use strict";

    var GeoengineView = require("base_geoengine.GeoengineView");
    var view_registry = require("web.view_registry");

    view_registry.add("geoengine", GeoengineView);
});
