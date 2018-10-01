odoo.define('web.GeoengineModel', function (require) {
"use strict";

/**
 * The GeoengineModel extends the BasicModel to load geometries 
 */

var BasicModel = require('web.BasicModel');

var GeoengineModel = BasicModel.extend({

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * TODO Add geo specific) when performing a `geŧ`.
     *
     * @override
     * @see _readTooltipFields
     * @returns {Object}
     */
    get: function () {
        var result = this._super.apply(this, arguments);
        var dp = result && this.localData[result.id];
        if (dp && dp.tooltipData) {
            result.tooltipData = $.extend(true, {}, dp.tooltipData);
        }
        if (dp && dp.progressBarValues) {
            result.progressBarValues = $.extend(true, {}, dp.progressBarValues);
        }
        return result;
    },
    /**
     * Same as @see get but getting the parent element whose ID is given.
     *
     * @param {string} id
     * @returns {Object}
     */
    getColumn: function (id) {
        var element = this.localData[id];
        if (element) {
            return this.get(element.parentID);
        }
        return null;
    },
    /**
     * @override
     */
    load: function (params) {
        this.defaultGroupedBy = params.groupBy;
        params.groupedBy = (params.groupedBy && params.groupedBy.length) ? params.groupedBy : this.defaultGroupedBy;
        return this._super(params);
    },
    /**
     * Opens a given group and loads its <limit> first records
     *
     * @param {string} groupID
     * @returns {Deferred}
     */
    loadColumnRecords: function (groupID) {
        var dataPoint = this.localData[groupID];
        dataPoint.isOpen = true;
        return this.reload(groupID);
    },
    /**
     * @override
     */
    reload: function (id, options) {
        // if the groupBy is given in the options and if it is an empty array,
        // fallback on the default groupBy
        if (options && options.groupBy && !options.groupBy.length) {
            options.groupBy = this.defaultGroupedBy;
        }
        var def = this._super(id, options);
        if (options && options.loadMoreOffset) {
            return def;
        }
        return this._reloadProgressBarGroupFromRecord(id, def);
    },
    /**
     * @override
    save: function (recordID) {
        var def = this._super.apply(this, arguments);
        return this._reloadProgressBarGroupFromRecord(recordID, def);
    },
     */

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    _makeDataPoint: function (params) {
        var dataPoint = this._super.apply(this, arguments);
        if (params.progressBar) {
            dataPoint.progressBar = params.progressBar;
        }
        return dataPoint;
    },
    /**
     * @override
     */
    _load: function (dataPoint, options) {
        if (dataPoint.progressBar) {
            return this._readProgressBarGroup(dataPoint, options);
        }
        return this._super.apply(this, arguments);
    },
});
return KanbanModel;
});

