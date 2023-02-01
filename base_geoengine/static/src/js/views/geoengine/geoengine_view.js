/* ---------------------------------------------------------
 * Odoo base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Payot 2015-2018 Camptocamp SA
 * License in __manifest__.py at root level of the module
 * ---------------------------------------------------------
 */
odoo.define("base_geoengine.GeoengineView", function (require) {
    "use strict";

    /* ---------------------------------------------------------
     * Odoo geoengine view
     * ---------------------------------------------------------
     */

    var core = require("web.core");
    var BasicView = require("web.BasicView");
    var GeoengineController = require("base_geoengine.GeoengineController");
    var GeoengineRenderer = require("base_geoengine.GeoengineRenderer");
    var geoengine_common = require("base_geoengine.geoengine_common");

    var _lt = core._lt;

    var GeoengineView = BasicView.extend(geoengine_common.GeoengineMixin, {
        accesskey: "g",
        display_name: _lt("Geoengine"),
        icon: "fa-map-o",
        config: _.extend({}, BasicView.prototype.config, {
            Renderer: GeoengineRenderer,
            Controller: GeoengineController,
        }),
        viewType: "geoengine",
        template: "GeoengineView",

        /**
         * @override
         *
         * @param {Object} viewInfo
         * @param {Object} params
         * @param {Boolean} params.sidebar
         * @param {Boolean} [params.hasSelectors=true]
         */
        init: function (viewInfo, params) {
            this._super.apply(this, arguments);

            this.controllerParams.hasSidebar = params.sidebar;
            this.rendererParams.viewInfo = viewInfo;

            this.loadParams.limit = 1000;
        },
    });

    return GeoengineView;
});
