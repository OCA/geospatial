odoo.define('base_geoengine.GeoengineModel', function (require) {
"use strict";

/**
 * The GeoengineModel extends the BasicModel to load geometries 
 */

var BasicModel = require('web.BasicModel');

var GeoengineModel = BasicModel.extend({

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    init: function () {
        this._super.apply(this, arguments);
        this.map = null;
        this.rasterLayers = null;
        this.vectorLayers = null;
    },

    /**
     * TODO Add geo specific) when performing a `geŧ`.
     *
     * @override
     * @returns {Object}
     */
    get: function () {
        var result = this._super.apply(this, arguments);
        //TODO result.map = this.map;
        return result;
    },
    /**
     * Initial loading.
     *
     * @param {Object} params
     * @param {Object} params.context
     * @param {string[]} params.domain
     * @returns {Deferred} The deferred does not return a handle, we don't need
     *   to keep track of various entities.
     */
    load: function (params) {
        this._super.apply(this, arguments);
    },
    /**
     * Reload all data for a given resource
     */
    reload: function (id, options) {
        this._super.apply(this, arguments);
    },


});
return GeoengineModel;
});

