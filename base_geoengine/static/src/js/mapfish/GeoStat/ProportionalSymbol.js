/*
 * Copyright (C) 2007  Camptocamp
 *
 * This file is part of MapFish Client
 *
 * MapFish Client is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MapFish Client is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with MapFish Client.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @requires core/GeoStat.js
 */

/**
 * Class: mapfish.GeoStat.ProportionalSymbol
 * Use this class to create proportional symbols on a map.
 *
 * Mandatory options are :
 * - features
 * 
 * Example usage :
 * > new mapfish.GeoStat.ProportionalSymbol(this.map, {
 * >     minSize: 5,
 * >     maxSize: 15,
 * >     idAttribute:
 * > });
 *
 * Inherits from:
 * - <mapfish.GeoStat>
 */
mapfish.GeoStat.ProportionalSymbol = OpenLayers.Class(mapfish.GeoStat, {
    
    /**
     * APIProperty: minSize
     * {Integer} The minimum radius size
     */
    minSize: 2,

    /**
     * APIProperty: maxSize
     * {Integer} The maximum radius size
     */
    maxSize: 20,

    /**
     * Property: minVal
     * {Float} The minimum value in the distribution
     */
    minVal: null,

    /**
     * Property: maxVal
     * {Float} The maximum value in the distribution
     */
    maxVal: null,

    /**
     * Constructor: OpenLayers.Layer
     *
     * Parameters:
     * map - {<OpenLayers.Map>} OpenLayers map object
     * options - {Object} Hashtable of extra options
     */
    initialize: function(map, options) {
        mapfish.GeoStat.prototype.initialize.apply(this, arguments);
    },

    /**
     * APIMethod: updateOptions
     *      Method used to update the properties indicator, minSize
     *      and maxSize.
     *
     * Parameters:
     * newOptions - {Object} options object
     */
    updateOptions: function(newOptions) {
        var oldOptions = OpenLayers.Util.extend({}, this.options);
        this.addOptions(newOptions);
        if (newOptions && newOptions.indicator != oldOptions.indicator) {
            this.setClassification();
        }
    },

    /**
     * Method: setClassification
     *      Creates a classification with the features
     */   
    setClassification: function() {
        var values = [];
        var features = this.layer.features;
        for (var i = 0; i < features.length; i++) {
            values.push(features[i].attributes[this.indicator]);
        }
        var dist = new mapfish.GeoStat.Distribution(values);
        this.minVal = dist.minVal;
        this.maxVal = dist.maxVal;
    },

    /**
     * APIMethod: applyClassification
     *      This function loops over the layer's features
     *      and applies already given classification.
     *
     * Parameters:
     * options - {Object} Options object with a single
     *      {Boolean} property: resetClassification.
     */
    applyClassification: function(options) {
        if (options && options.resetClassification) {
            this.setClassification();
        }
        var calculateRadius = OpenLayers.Function.bind(
            function(feature) {
                var value = feature.attributes[this.indicator];
                var size = (value - this.minVal) / (this.maxVal - this.minVal) *
                           (this.maxSize - this.minSize) + this.minSize;
                return size;
            }, this
        );
        this.extendStyle(null,
            {'pointRadius': '${calculateRadius}'},
            {'calculateRadius': calculateRadius}
        );
        mapfish.GeoStat.prototype.applyClassification.apply(this, arguments);
    },
    
    /**
     * Method: updateLegend
     *    Update the legendDiv content with new bins label
     */
    updateLegend: function() {
        if (!this.legendDiv) {
            return;
        }
        this.legendDiv.innerHTML = "Needs to be done !";
        // TODO use css classes instead
    },
    
    CLASS_NAME: "mapfish.GeoStat.ProportionalSymbol"
});
