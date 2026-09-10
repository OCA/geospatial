/** @odoo-module **/

/* global console, document, ol */

/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

import publicWidget from "@web/legacy/js/public/public_widget";
import {renderToElement} from "@web/core/utils/render";
import {rpc} from "@web/core/network/rpc";
import {createOlMap} from "./map_utils.esm";

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

publicWidget.registry.OpenLayerStoreLocator = publicWidget.Widget.extend({
    selector: ".s_openlayer_store_locator",
    cssLibs: [
        "/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css",
        "/website_geoengine_store_locator/static/lib/node_modules/jquery-flexdatalist/jquery.flexdatalist.css",
    ],

    /**
     * @override
     */
    start() {
        if (!this.el.querySelector(".ol-viewport")) {
            this._initMap();
        }
        return this._super(...arguments);
    },

    /**
     * Initialize the OpenLayers map with all layers, popover and search.
     */
    _initMap() {
        const dataset = this.el.dataset;
        const mapType = dataset.mapType || "mapnik";
        const mapElement = this.el.querySelector(".map");
        const {map, stores} = createOlMap(mapElement, mapType);

        if (mapElement) {
            this._initPopover(this.el.querySelector("#popup"), map);
            this._initSearch(
                this.el.querySelector("#search"),
                map,
                mapElement,
                stores,
                dataset.maxResults,
                dataset.mapZoom
            );
        }
    },

    // -------------------------------------------------------------------------
    // Popover
    // -------------------------------------------------------------------------

    /**
     * Set up the popover overlay on the map.
     * @param {HTMLElement} popoverEl the popup element
     * @param {ol.Map} map the OpenLayers map
     */
    _initPopover(popoverEl, map) {
        this._popover = undefined;
        this._popoverFeature = undefined;
        this._popoverEl = popoverEl;
        this._popoverJqueryEl = $(popoverEl);
        this._popoverMap = map;
        this._popoverOverlay = new ol.Overlay({
            element: this._popoverEl,
            positioning: "bottom-center",
            stopEvent: false,
        });
        map.addOverlay(this._popoverOverlay);
        map.on("click", this._onMapClick.bind(this));
        map.on("pointermove", this._onMapPointerMove.bind(this));
        map.getView().on("change:center", this._onMapMove.bind(this));
    },

    /**
     * Dispose the popover
     */
    _disposePopover() {
        if (this._popover) {
            this._popover.popover("dispose");
            this._popover = undefined;
        }
    },

    /**
     * Reposition the popover when the map view moves.
     */
    _onMapMove() {
        if (!this._popoverFeature) {
            return;
        }
        $(this._popoverEl).popover("show");
    },

    /**
     * Handle map click to show feature popover.
     * @param {ol.MapBrowserEvent} event the map click event
     */
    _onMapClick(event) {
        this._popoverFeature = this._popoverMap.forEachFeatureAtPixel(
            event.pixel,
            function (feature) {
                return feature;
            }
        );

        this._disposePopover();
        if (!this._popoverFeature) {
            return;
        }

        this._popoverOverlay.setPosition(
            this._popoverFeature.getGeometry().getFirstCoordinate()
        );
        if (!this._popover) {
            const popoverContent = renderToElement(
                "website_geoengine_store_locator.s_openlayer_store_locator_popover",
                {
                    name: this._popoverFeature.get("name"),
                    street: this._popoverFeature.get("street"),
                    street2: this._popoverFeature.get("street2"),
                    zip: this._popoverFeature.get("zip"),
                    city: this._popoverFeature.get("city"),
                    tags: this._popoverFeature.get("tags"),
                    opening_hours: this._popoverFeature.get("opening_hours"),
                }
            );
            this._popover = $(this._popoverEl).popover({
                placement: "top",
                html: true,
                trigger: "focus",
                content: popoverContent.innerHTML,
            });
        }
        this._popover.popover("show");
    },

    /**
     * Change cursor to pointer when hovering over a feature.
     * @param {ol.MapBrowserEvent} e the pointer move event
     */
    _onMapPointerMove(e) {
        const pixel = this._popoverMap.getEventPixel(e.originalEvent);
        const hit = this._popoverMap.hasFeatureAtPixel(pixel);
        this._popoverMap.getTarget().style.cursor = hit ? "pointer" : "";
    },

    // -------------------------------------------------------------------------
    // Search
    // -------------------------------------------------------------------------

    /**
     * Set up the search functionality.
     * @param {HTMLElement} searchEl the search input element
     * @param {ol.Map} map the OpenLayers map
     * @param {HTMLElement} mapElement the map DOM element
     * @param {ol.layer.Vector} stores the stores vector layer
     * @param {Number} maxResults maximum number of results
     * @param {Number} mapZoom the zoom level
     */
    _initSearch(searchEl, map, mapElement, stores, maxResults = 200, mapZoom = -1) {
        this._searchEl = searchEl;
        this._searchJqueryEl = $(searchEl);
        this._searchJqueryEl.val("");
        this._searchMap = map;
        this._searchStores = stores;
        this._lastSearchText = "";
        this._searchMapElement = mapElement;
        this._searchMaxResults = maxResults;
        this._searchMapZoom = mapZoom;
        this._searchMessage = null;

        this._searchStores.setStyle(
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

        this._searchFormat = new ol.format.GeoJSON({
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });

        this._searchLang = (
            document.documentElement.getAttribute("lang") || "en_US"
        ).replace("-", "_");

        this._searchJqueryEl.flexdatalist({
            minLength: 3,
            multiple: true,
            focusFirstResult: true,
            maxShownResults: 10,
            searchIn: ["value"],
            visibleProperties: ["text"],
            textProperty: "text",
            valueProperty: "text",
            searchContain: true,
            cache: false,
        });

        this._searchJqueryInputEl = searchEl.querySelector("ul input");
        this._searchJqueryEl.on(
            "before:flexdatalist.search",
            this._loadSearchData.bind(this)
        );
        this._searchJqueryEl.on("change:flexdatalist", () => {
            const value = this._searchJqueryEl.flexdatalist("value");
            if (value.length === 0) {
                this._loadPartners([], true);
                return;
            }
            const arg = [];
            for (const item of value) {
                const valueSplit = item.split(":");
                if (valueSplit.length === 2) {
                    arg.push({field: valueSplit[0], value: valueSplit[1].trim()});
                }
            }
            this._loadPartners(arg);
        });

        this._loadPartners([], true);
    },

    /**
     * Load partners from the server and display them on the map.
     * @param {Array} tags the search tags
     * @param {Boolean} firstTime whether this is the initial load
     */
    _loadPartners(tags, firstTime = false) {
        if (this._searchMessage !== null) {
            this._searchMapElement.removeChild(this._searchMessage[0]);
            this._searchMessage = null;
        }

        const args = {
            tags: tags,
            lang: this._searchLang,
            max_results: this._searchMaxResults,
        };

        rpc("/website-geoengine/partners", args).then(
            (result) => {
                const storesSource = this._searchStores.getSource();
                storesSource.clear();
                if ("error" in result) {
                    this._searchMessage = $("<div>", {});
                    this._searchMessage.addClass("message");
                    this._searchMessage.click(() => {
                        this._searchMapElement.removeChild(this._searchMessage[0]);
                        this._searchMessage = null;
                    });
                    if (firstTime) {
                        this._searchMessage.text(
                            "Use the search field to find a store"
                        );
                    } else {
                        this._searchMessage.text(
                            "Too many results, please refine your search"
                        );
                    }
                    $(this._searchMapElement).append(this._searchMessage);
                    this._searchMap.getView().setZoom(this._searchMapZoom);
                    return;
                }
                for (const feature of result) {
                    storesSource.addFeature(this._searchFormat.readFeature(feature));
                }
                if (storesSource.getFeatures().length === 0) {
                    return;
                }
                const extent = storesSource.getExtent();
                const addWidth = (extent[2] - extent[0]) / 10;
                const addHeight = (extent[3] - extent[1]) / 10;
                if (addWidth === 0 && addHeight === 0) {
                    this._searchMap.getView().setCenter([extent[0], extent[1]]);
                } else {
                    this._searchMap
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
                console.error(error);
            }
        );
    },

    /**
     * Load search autocomplete data from the server.
     * @param {Event} event the flexdatalist event
     * @param {String} text the search text
     */
    _loadSearchData(event, text) {
        if (text === this._lastSearchText) {
            return;
        }
        this._lastSearchText = text;

        if (this._searchMessage !== null) {
            this._searchMapElement.removeChild(this._searchMessage[0]);
            this._searchMessage = null;
        }

        this._searchJqueryEl.flexdatalist("data", []);
        this._searchJqueryEl.flexdatalist("noResultsText", "Loading...");

        const args = {
            tags: text,
            lang: this._searchLang,
        };
        rpc("/website-geoengine/tags", args).then(
            (result) => {
                const data = [];
                for (const item of result) {
                    data.push({
                        value: item[1],
                        text: `${item[0]}: ${item[1]}`,
                    });
                }
                this._searchJqueryEl.flexdatalist("data", data);
                $(this._searchEl.parentElement.querySelector("ul input")).keyup();
                this._searchJqueryEl.flexdatalist(
                    "noResultsText",
                    'No results found for "{keyword}"'
                );
            },
            (error) => {
                console.error(error);
                this._searchJqueryEl.flexdatalist(
                    "noResultsText",
                    "Error while loading data"
                );
            }
        );
    },
});

export default publicWidget.registry.OpenLayerStoreLocator;
