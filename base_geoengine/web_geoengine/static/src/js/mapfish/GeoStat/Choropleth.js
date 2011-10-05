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
 * @requires core/Color.js
 */

/**
 * Class: mapfish.GeoStat.Choropleth
 * Use this class to create choropleths on a map.
 *
 * Inherits from:
 * - <mapfish.GeoStat>
 */
mapfish.GeoStat.Choropleth = OpenLayers.Class(mapfish.GeoStat, {

    /**
     * APIProperty: colors
     * {Array(<mapfish.Color>}} Array of 2 colors to be applied to features
     *     We should use styles instead
     */
    colors: [
        new mapfish.ColorRgb(120, 120, 0),
        new mapfish.ColorRgb(255, 0, 0)
    ],

    /**
     * APIProperty: method
     * {Integer} Specifies the distribution method to use. Possible
     *      values are:
     *      mapfish.GeoStat.Distribution.CLASSIFY_BY_QUANTILS and
     *      mapfish.GeoStat.Distribution.CLASSIFY_BY_EQUAL_INTERVALS
     */
    method: mapfish.GeoStat.Distribution.CLASSIFY_BY_QUANTILS,

    /**
     * APIProperty: numClasses
     * {Integer} Number of classes
     */
    numClasses: 5,

    /**
     * Property: defaultSymbolizer
     * {Object} Overrides defaultSymbolizer in the parent class
     */
    defaultSymbolizer: {'fillOpacity': 1},

    /**
     * Property: classification
     * {<mapfish.GeoStat.Classification>} Defines the different classification to use
     */
    classification: null,

    /**
     * Property: colorInterpolation
     * {Array({<mapfish.Color>})} Array of {<mapfish.Color} resulting from the
     *      RGB color interpolation
     */
    colorInterpolation: null,

    /**
     * Constructor: mapfish.GeoStat.Choropleth
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
     *      Method used to update the properties method, indicator,
     *      numClasses and colors.
     *
     * Parameters:
     * newOptions - {Object} options object
     */
    updateOptions: function(newOptions) {
        var oldOptions = OpenLayers.Util.extend({}, this.options);
        this.addOptions(newOptions);
        if (newOptions) {
            if (newOptions.method != oldOptions.method ||
                newOptions.indicator != oldOptions.indicator ||
                newOptions.numClasses != oldOptions.numClasses) {
                this.setClassification();
            } else if (newOptions.colors && (
                       !newOptions.colors[0].equals(oldOptions.colors[0]) ||
                       !newOptions.colors[1].equals(oldOptions.colors[1]))) {
                this.createColorInterpolation();
            }
        }
    },

    /**
     * Method: createColorInterpolation
     *      Generates color interpolation in regard to classification.
     */
    createColorInterpolation: function() {
        var initialColors = this.colors;
        var numColors = this.classification.bins.length;
        this.colorInterpolation =
            mapfish.ColorRgb.getColorsArrayByRgbInterpolation(
                initialColors[0], initialColors[1], numColors
            );
    },

    /**
     * Method: setClassification
     *      Creates a classification with the features.
     */
    setClassification: function() {
        var values = [];
        var features = this.layer.features;
        for (var i = 0; i < features.length; i++) {
            values.push(features[i].attributes[this.indicator]);
        }

        var distOptions = {
            'labelGenerator' : this.options.labelGenerator
        };
        var dist = new mapfish.GeoStat.Distribution(values, distOptions);
        this.classification = dist.classify(
            this.method,
            this.numClasses,
            null
        );
        this.createColorInterpolation();
    },

    /**
     * APIMethod: applyClassification
     *      Style the features based on the classification
     *
     * Parameters:
     * options - {Object}
     */
    applyClassification: function(options) {
        this.updateOptions(options);
        var boundsArray = this.classification.getBoundsArray();
        var rules = new Array(boundsArray.length - 1);
        for (var i = 0; i < boundsArray.length -1; i++) {
            var rule = new OpenLayers.Rule({
                symbolizer: {fillColor: this.colorInterpolation[i].toHexString()},
                filter: new OpenLayers.Filter.Comparison({
                    type: OpenLayers.Filter.Comparison.BETWEEN,
                    property: this.indicator,
                    lowerBoundary: boundsArray[i],
                    upperBoundary: boundsArray[i + 1]
                })
            });
            rules[i] = rule;
        }
        this.extendStyle(rules);
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

        // TODO use css classes instead
        this.legendDiv.update("");
        for (var i = 0; i < this.classification.bins.length; i++) {
            var element = document.createElement("div");
            element.style.backgroundColor = this.colorInterpolation[i].toHexString();
            element.style.width = "30px";
            element.style.height = "15px";
            element.style.cssFloat = "left";
            element.style.marginRight = "10px";
            this.legendDiv.appendChild(element);

            element = document.createElement("div");
            element.innerHTML = this.classification.bins[i].label;
            this.legendDiv.appendChild(element);

            element = document.createElement("div");
            element.style.clear = "left";
            this.legendDiv.appendChild(element);
        }
    },

    CLASS_NAME: "mapfish.GeoStat.Choropleth"
});
