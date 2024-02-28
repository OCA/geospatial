/** @odoo-module **/

//import rpc from "web.rpc";
import session from 'web.session';

/**
 * Create a standard symbol for a POI
 * @param {number} height the height of the circle center
 * @param {number} radius the radius of the top circle
 * @param {string} fillColor the fill color of the symbol
 * @param {number} strokeWidth the stroke width of the symbol
 * @param {string} strokeColor the stroke color of the symbol
 * @param {number} centerRadius the radius of the center point
 * @param {string} centerFillColor the fill color of the center point
 * @param {number} centerStrokeWidth the stroke width of the center point
 * @param {string} centerStrokeColor the stroke color of the center point
 * @returns
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
        alpha == 0 ? canvas.width / 2 : radius + strokeWidth / 2,
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
    if (alpha != 0) {
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
    } else {
        context.moveTo(circleCenter[0] + radius, circleCenter[1]);
        context.arc(circleCenter[0], circleCenter[1], radius, 0, Math.PI * 2);
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
 * @param {number} height the height of the circle center
 * @param {number} radius the radius of the top circle
 * @param {string} fillColor the fill color of the symbol
 * @param {number} strokeWidth the stroke width of the symbol
 * @param {string} strokeColor the stroke color of the symbol
 * @param {number} centerRadius the radius of the center point
 * @param {string} centerFillColor the fill color of the center point
 * @param {number} centerStrokeWidth the stroke width of the center point
 * @param {string} centerStrokeColor the stroke color of the center point
 * @returns
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
    /**
     * The search input element
     * @type {HTMLInputElement}
     */
    element = undefined;

    constructor(element, map, stores) {
        this.element = element;
        this.jquery_element = $(element);
        this.jquery_element.val("");

        this.map = map;
        this.stores = stores;
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
        this.format = new ol.format.GeoJSON({
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });

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
            // combo box
            visibleProperties: ["text"],
            // tag list in field
            textProperty: "text",
            // the managed value
            valueProperty: "text",
            cache: false,
        });
        this.jquery_input_element = element.querySelector("ul input");
        this.jquery_element.on("before:flexdatalist.search", this.loadDatas.bind(this));
        this.jquery_element.on("change:flexdatalist", () => {
            console.log("select");
            const value = this.jquery_element.flexdatalist("value");
            if (value.length == 0) {
                this.stores.getSource().clear();
                return;
            }
            const arg = [];
            for (let item of value) {
                const value_split = item.split(":");
                arg.push({'field': value_split[0], 'value': value_split[1].trim()})
            }

            const args = {
                'tags': arg,
                'lang': this.lang
            };

            session.rpc('/website-geoengine/partners', args).then((result) => {
                    console.log(result);
                    const storesSource = this.stores.getSource();
                    storesSource.clear();
                    for (let feature of result) {
                        console.log(this.format.readFeature(feature));
                        storesSource.addFeature(this.format.readFeature(feature));
                    }
                    const extent = storesSource.getExtent();
                    const addWidth = (extent[2] - extent[0]) / 10;
                    const addHeight = (extent[3] - extent[1]) / 10;
                    if (addWidth == 0 && addHeight == 0) {
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
        });
    }

    loadDatas(event, text) {
        const args = {
            'tags': text,
            'lang': this.lang
        }
        session.rpc('/website-geoengine/tags', args).then((result) => {
                const data = [];
                for (let item of result) {
                    data.push({
                        value: item[1],
                        text: `${item[0]}: ${item[1]}`,
                    });
                }
                this.jquery_element.flexdatalist("data", data);
                $(this.element.parentElement.querySelector("ul input")).keyup();

            },
            (error) => {
                console.error(error);
            }
        );
    }
}

export default Search;
