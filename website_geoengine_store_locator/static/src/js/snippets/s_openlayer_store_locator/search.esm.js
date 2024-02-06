/** @odoo-module **/

/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

import session from "web.session";

/**
 * Create a standard symbol for a POI
 * @param {Number} height the height of the circle center
 * @param {Number} radius the radius of the top circle
 * @param {String} fillColor the fill color of the symbol
 * @param {Number} strokeWidth the stroke width of the symbol
 * @param {String} strokeColor the stroke color of the symbol
 * @param {Number} centerRadius the radius of the center point
 * @param {String} centerFillColor the fill color of the center point
 * @param {Number} centerStrokeWidth the stroke width of the center point
 * @param {String} centerStrokeColor the stroke color of the center point
 * @returns {Object} the canvas
 */
function buildCanvas(
    height,
    radius,
    fillColor,
    strokeWidth,
    strokeColor,
    centerRadius,
    centerFillColor,
    centerStrokeWidth,
    centerStrokeColor
) {
    const negateHeight = height < 0;
    height = Math.abs(height);

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(radius * 2 + strokeWidth);
    canvas.height = Math.ceil(
        height < radius ? radius * 2 + strokeWidth : radius + height + strokeWidth
    );
    const context = canvas.getContext("2d");
    if (negateHeight) {
        context.setTransform(1, 0, 0, -1, 0, canvas.height);
    }

    const alpha = radius < height ? Math.acos(radius / height) : 0;
    const circleCenter = [
        canvas.width / 2,
        alpha === 0 ? canvas.width / 2 : radius + strokeWidth / 2,
    ];
    const linesStart = [canvas.width / 2, radius + height + strokeWidth / 2];
    const linesWeight = Math.sin(alpha) * radius;
    const linesHeight = height - Math.cos(alpha) * radius;
    const line1End = [canvas.width / 2 - linesWeight, linesStart[1] - linesHeight];
    const line2End = [canvas.width / 2 + linesWeight, linesStart[1] - linesHeight];

    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    context.lineJoin = "round";

    context.beginPath();
    if (alpha === 0) {
        context.moveTo(circleCenter[0] + radius, circleCenter[1]);
        context.arc(circleCenter[0], circleCenter[1], radius, 0, Math.PI * 2);
    } else {
        context.moveTo(line2End[0], line2End[1]);
        context.lineTo(linesStart[0], linesStart[1]);
        context.lineTo(line1End[0], line1End[1]);
        context.arc(
            circleCenter[0],
            circleCenter[1],
            radius,
            Math.PI / 2 + alpha,
            Math.PI / 2 - alpha
        );
        context.lineTo(line2End[0], line2End[1]);
    }
    context.stroke();
    context.moveTo(circleCenter[0] + centerRadius, circleCenter[1]);
    context.arc(circleCenter[0], circleCenter[1], centerRadius, 0, Math.PI * 2, true);
    context.closePath();
    context.fill();

    context.fillStyle = centerFillColor;
    context.strokeStyle = centerStrokeColor;
    context.lineWidth = centerStrokeWidth;
    context.beginPath();
    context.arc(circleCenter[0], circleCenter[1], centerRadius, 0, Math.PI * 2);
    context.closePath();
    context.stroke();
    context.fill("evenodd");
    return canvas;
}

/**
 * A class to create an icon with a hit detection image
 */
class StyleIconHit extends ol.style.Icon {
    setHitDetectionImage(canvas) {
        this.canvasHit = canvas;
    }
    getHitDetectionImage() {
        return this.canvasHit;
    }
}
/**
 * Create a standard symbol for a POI
 * @param {Number} height the height of the circle center
 * @param {Number} radius the radius of the top circle
 * @param {String} fillColor the fill color of the symbol
 * @param {Number} strokeWidth the stroke width of the symbol
 * @param {String} strokeColor the stroke color of the symbol
 * @param {Number} centerRadius the radius of the center point
 * @param {String} centerFillColor the fill color of the center point
 * @param {Number} centerStrokeWidth the stroke width of the center point
 * @param {String} centerStrokeColor the stroke color of the center point
 * @returns {Object} the icon
 */
function buildIcon(
    height,
    radius,
    fillColor,
    strokeWidth,
    strokeColor,
    centerRadius,
    centerFillColor,
    centerStrokeWidth,
    centerStrokeColor
) {
    const canvas = buildCanvas(
        height,
        radius,
        fillColor,
        strokeWidth,
        strokeColor,
        centerRadius,
        centerFillColor,
        centerStrokeWidth,
        centerStrokeColor
    );
    const negateHeight = height < 0;

    const icon =
        radius >= Math.abs(height)
            ? new StyleIconHit({
                  img: canvas,
                  anchor: [0.5, 0.5 + height / radius / 2],
              })
            : new StyleIconHit({
                  img: canvas,
                  anchor: [0.5, negateHeight ? 0 : 1],
              });

    icon.setHitDetectionImage(
        buildCanvas(
            height,
            radius,
            fillColor,
            strokeWidth,
            strokeColor,
            0,
            centerFillColor,
            centerStrokeWidth,
            centerStrokeColor
        )
    );
    return icon;
}

class Search {
    constructor(element, map, mapElement, stores, maxResults = 200, mapZoom = -1) {
        /**
         * The search input element
         * @type {HTMLInputElement}
         */
        this.element = element;
        /**
         * The search input JQuery element
         * @type {JQuery<HTMLElement>}
         */
        this.jquery_element = $(element);
        this.jquery_element.val("");

        /**
         * The map
         * @type {ol.Map}
         */
        this.map = map;
        /**
         * The stores layer
         * @type {ol.layer.Vector}
         */
        this.stores = stores;
        /**
         * The last search text
         * @type {string}
         */
        this.last_search_text = "";

        /**
         * The search input element
         * @type {HTMLInputElement}
         */
        this.mapElement = mapElement;
        /**
         * The maximum number of results
         * @type {number}
         */
        this.maxResults = maxResults;
        /**
         * The zoom level of the map
         * @type {number}
         */
        this.mapZoom = mapZoom;
        /**
         * The message element
         * @type {JQuery<HTMLElement>}
         */
        this.message = null;

        this.stores.setStyle(
            new ol.style.Style({
                image: buildIcon(
                    20,
                    10,
                    "rgba(44, 131, 151, 0.8)",
                    2,
                    "rgb(0, 0, 0)",
                    4,
                    "rgba(0, 0, 0, 0)",
                    2,
                    "rgb(0, 0, 0)"
                ),
            })
        );

        /**
         * The format to read the features
         * @type {ol.format.GeoJSON}
         */
        this.format = new ol.format.GeoJSON({
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });

        /**
         * The language of the user
         * @type {string}
         */
        this.lang = (document.documentElement.getAttribute("lang") || "en_US").replace(
            "-",
            "_"
        );

        this.jquery_element.flexdatalist({
            minLength: 3,
            multiple: true,
            focusFirstResult: true,
            maxShownResults: 10,
            searchIn: ["value"],
            // Combo box
            visibleProperties: ["text"],
            // Tag list in field
            textProperty: "text",
            // The managed value
            valueProperty: "text",
            searchContain: true,
            cache: false,
        });

        /**
         * The input element of the flexdatalist
         * @type {HTMLInputElement}
         */
        this.jquery_input_element = element.querySelector("ul input");
        this.jquery_element.on("before:flexdatalist.search", this.loadDatas.bind(this));
        this.jquery_element.on("change:flexdatalist", () => {
            const value = this.jquery_element.flexdatalist("value");
            if (value.length === 0) {
                // Initial state
                this.loadPartners([], true);
                return;
            }
            const arg = [];
            for (const item of value) {
                const value_split = item.split(":");
                if (value_split.length === 2) {
                    arg.push({field: value_split[0], value: value_split[1].trim()});
                }
            }

            this.loadPartners(arg);
        });

        this.loadPartners([], true);
    }

    loadPartners(tags, firstTime = false) {
        if (this.message !== null) {
            this.mapElement.removeChild(this.message[0]);
            this.message = null;
        }

        const args = {
            tags: tags,
            lang: this.lang,
            maxResults: this.maxResults,
        };

        session.rpc("/website-geoengine/partners", args).then(
            (result) => {
                const storesSource = this.stores.getSource();
                storesSource.clear();
                if ("error" in result) {
                    this.message = $("<div>", {});
                    this.message.addClass("message");
                    this.message.click(() => {
                        this.mapElement.removeChild(this.message[0]);
                        this.message = null;
                    });
                    if (firstTime) {
                        this.message.text("Use the search field to find a store");
                    } else {
                        this.message.text(
                            "Too many results, please refine your search"
                        );
                    }
                    $(this.mapElement).append(this.message);
                    this.map.getView().setZoom(this.mapZoom);
                    return;
                }
                for (const feature of result) {
                    storesSource.addFeature(this.format.readFeature(feature));
                }
                if (storesSource.getFeatures().length === 0) {
                    return;
                }
                const extent = storesSource.getExtent();
                const addWidth = (extent[2] - extent[0]) / 10;
                const addHeight = (extent[3] - extent[1]) / 10;
                if (addWidth === 0 && addHeight === 0) {
                    this.map.getView().setCenter([extent[0], extent[1]]);
                } else {
                    this.map
                        .getView()
                        .fit([
                            extent[0] - addWidth,
                            extent[1] - addHeight,
                            extent[2] + addWidth,
                            extent[3] + addHeight,
                        ]);
                }
            },
            (error) => {
                console.log(error);
            }
        );
    }

    loadDatas(event, text) {
        if (text === this.last_search_text) {
            return;
        }
        this.last_search_text = text;

        if (this.message !== null) {
            this.mapElement.removeChild(this.message[0]);
            this.message = null;
        }

        this.jquery_element.flexdatalist("data", []);
        this.jquery_element.flexdatalist("noResultsText", "Loading...");

        const args = {
            tags: text,
            lang: this.lang,
        };
        session.rpc("/website-geoengine/tags", args).then(
            (result) => {
                const data = [];
                for (const item of result) {
                    data.push({
                        value: item[1],
                        text: `${item[0]}: ${item[1]}`,
                    });
                }
                this.jquery_element.flexdatalist("data", data);
                $(this.element.parentElement.querySelector("ul input")).keyup();
                this.jquery_element.flexdatalist(
                    "noResultsText",
                    'No results found for "{keyword}"'
                );
            },
            (error) => {
                console.error(error);
                this.jquery_element.flexdatalist(
                    "noResultsText",
                    "Error while loading data"
                );
            }
        );
    }
}

export default Search;
