/*---------------------------------------------------------
 * Odoo base_geoengine
 * Author Yannick Vaucher 2018 Camptocamp SA
 * License in __manifest__.py at root level of the module
 *---------------------------------------------------------
*/
odoo.define('base_geoengine.GeoengineView', function (require) {
"use strict";

/*---------------------------------------------------------
 * Odoo geoengine view
 *---------------------------------------------------------*/

var core = require('web.core');
var time = require('web.time');

var BasicView = require('web.BasicView');
var QWeb = require('web.QWeb');
var GeoengineRecord = require('base_geoengine.Record');
var GeoengineController = require('base_geoengine.GeoengineController');
var GeoengineRenderer = require('base_geoengine.GeoengineRenderer');
var GeoengineModel = require('base_geoengine.GeoengineModel');

var session = require('web.session');
var utils = require('web.utils');

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
        Model: GeoengineModel,
    }),
    viewType: 'geoengine',
    template: "GeoengineView",

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
        var selectedRecords = []; // there is no selected records by default

	// TODO this.qweb = new QWeb(session.debug, {_s: session.origin});
        this.controllerParams.hasSidebar = params.sidebar;
        this.controllerParams.selectedRecords = selectedRecords;

        this.rendererParams.mapOptions = {
	    'geoengine_layers': viewInfo.geoengine_layers,
        };
        this.rendererParams.geometryColumns = {};
        this.rendererParams.overlaysGroup = null;
        this.rendererParams.vectorSources = [];
        this.rendererParams.zoomToExtentCtrl = null;
        this.rendererParams.popupElement = undefined;
        this.rendererParams.overlayPopup = undefined;
        this.rendererParams.featurePopup = undefined;

        this.rendererParams.selectedRecords = selectedRecords;

       // this.loadParams.type = 'list';
    },


});


return GeoengineView;
});
