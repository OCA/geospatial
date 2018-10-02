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
var time = require('web.time');

var BasicView = require('web.BasicView');
var QWeb = require('web.QWeb');
var GeoengineRecord = require('base_geoengine.Record');
var GeoengineController = require('base_geoengine.GeoengineController');
var GeoengineRenderer = require('base_geoengine.GeoengineRenderer');

var session = require('web.session');
var utils = require('web.utils');

var geoengine_common = require('base_geoengine.geoengine_common');

var _lt = core._lt;

//var map, layer, vectorLayers = [];
//TODO: remove this DEBUG
var map = null;

/* CONSTANTS */
var DEFAULT_BEGIN_COLOR = "#FFFFFF";
var DEFAULT_END_COLOR = "#000000";
var DEFAULT_MIN_SIZE = 5; // for prop symbols only
var DEFAULT_MAX_SIZE = 15; // for prop symbols only
var DEFAULT_NUM_CLASSES = 5; // for choroplets only
var LEGEND_MAX_ITEMS = 10;

/**
 * Method: formatFeatureHTML
 * formats attributes into a string
 *
 * Parameters:
 * a - {Object}
 */
var formatFeatureHTML = function(a, fields) {
    var str = [];
    var oid = '';
    for (var key in a) {
        if (a.hasOwnProperty(key)) {
            var val = a[key];
            if (val === false) {
                continue;
            }
            var span = '';
            if (fields.hasOwnProperty(key)) {
                var field = fields[key];
                var label = field.string;
                if (field.type === 'selection') {
                    // get display value of selection option
                    for (var option in field.selection) {
                        if (field.selection[option][0] === val) {
                            val = field.selection[option][1];
                            break;
                        }
                    }
                }
                if (val instanceof Array) {
                    str.push('<span style="font-weight: bold">' + label + '</span>: ' +val[1]);
                } else {
                    span = '<span style="font-weight: bold">' + label + '</span>: ' +val;
                     if (key === 'id') {
                        oid = span;
                    } else {
                        str.push(span);
                    }
                }
            }
        }
    }
    str.unshift(oid);
    return str.join('<br />');
};
/**
 * Method: formatFeatureListHTML
 * formats attributes into a string
 *
 * Parameters:
 * features - [Array]
 */
var formatFeatureListHTML = function(features) {
    var str = [];
    // count unique record selected through all features
    var selected_ids = [];
    features.forEach(function(x) {
        var rec_id = x.get('attributes').id;
        if (selected_ids.indexOf(rec_id) < 0) {
            selected_ids.push(rec_id);
        }
    });
    str.push(selected_ids.length + ' selected records');
    return str.join('<br />');
};

var GeoengineView = BasicView.extend(geoengine_common.GeoengineMixin, {
    accesskey: "g",
    display_name: _lt('Geoengine'),
    icon: 'fa-map-o',
    config: _.extend({}, BasicView.prototype.config, {
        Renderer: GeoengineRenderer,
        Controller: GeoengineController,
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

        this.rendererParams.geometryColumns = {};
        this.rendererParams.overlaysGroup = null;
        this.rendererParams.vectorSources = [];
        this.rendererParams.zoomToExtentCtrl = null;
        this.rendererParams.popupElement = undefined;
        this.rendererParams.overlayPopup = undefined;
        this.rendererParams.featurePopup = undefined;

        this.rendererParams.selectedRecords = selectedRecords;

        this.loadParams.type = 'list';
    },


});


return GeoengineView;
});
