/*---------------------------------------------------------
 * Odoo base_geoengine
 * Author B.Binet Copyright Camptocamp SA
 * Contributor N. Bessi Copyright Camptocamp SA
 * Contributor Laurent Mignon 2015 Acsone SA/NV
 * Contributor Yannick Vaucher 2015-2018 Camptocamp SA
 * License in __manifest__.py at root level of the module
 *---------------------------------------------------------
*/
odoo.define('base_geoengine.GeoengineView', function (require) {
"use strict";

/*---------------------------------------------------------
 * Odoo geoengine view
 *---------------------------------------------------------*/

var core = require('web.core');
var BasicView = require('web.BasicView');
var GeoengineController = require('base_geoengine.GeoengineController');
var GeoengineRenderer = require('base_geoengine.GeoengineRenderer');

var _lt = core._lt;

var GeoengineView = BasicView.extend({
    accesskey: "g",
    display_name: _lt('Geoengine'),
    icon: 'fa-map-o',
    cssLibs: [
        '/base_geoengine/static/lib/ol-3.18.2/ol.css',
        '/base_geoengine/static/lib/geostats-1.4.0/geostats.css',
    ],
    jsLibs: [
        '/base_geoengine/static/lib/ol-3.18.2/ol-debug.js',
        '/base_geoengine/static/lib/ol3-layerswitcher.js',
        '/base_geoengine/static/lib/chromajs-0.8.0/chroma.js',
        '/base_geoengine/static/lib/geostats-1.4.0/geostats.js',
    ],
    config: _.extend({}, BasicView.prototype.config, {
        Renderer: GeoengineRenderer,
        Controller: GeoengineController,
    }),
    viewType: 'geoengine',
    template: 'GeoengineView',

    /**
     * @override
     *
     * @param {Object} viewInfo
     * @param {Object} params
     * @param {boolean} params.sidebar
     * @param {boolean} [params.hasSelectors=true]
     */
    init: function (viewInfo, params) {
        this._super.apply(this, arguments);

        this.controllerParams.hasSidebar = params.sidebar;
        this.rendererParams.viewInfo = viewInfo;

        // this.loadParams.type = 'list';
        this.loadParams.limit = 1000;
    },


});

return GeoengineView;
});
