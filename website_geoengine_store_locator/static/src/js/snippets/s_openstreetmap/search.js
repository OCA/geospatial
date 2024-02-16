/** @odoo-module **/

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

/**
 * Normalize a string by removing accents and lowercasing it for the search.
 * @param {string} text
 * @returns
 */
function normalize(text) {
    return text ? (
        text
            .toLowerCase()
            // remove accents
            .normalize("NFKD")
            .replace(/\p{Diacritic}/gu, "")
    ):'';
}

/**
 * A class to create a circle with no hit detection
 */
class StyleCircleNoHit extends ol.style.Circle {
    getHitDetectionImage() {
        return document.createElement("canvas");
    }
}

class Search {
    /**
     * The search input element
     * @type {HTMLInputElement}
     */
    element = undefined;

    constructor(element, stores) {
        this.element = element;
        this.stores = stores;
        element.addEventListener("keyup", this.onKeyUp.bind(this));
        this.update();
    }

    /**
     * The function called on input key up event
     * @param {KeyboardEvent} event
     */
    onKeyUp(event) {
        this.update();
    }

    update() {
        this.search = normalize(this.element.value).split(" ");
        this.stores.setStyle(this.styleFunction.bind(this));
    }
    /**
     * Check if a feature matches the search
     * @param {ol.Feature} feature
     * @returns {boolean}
     */
    searchFeature(feature) {
        for (let word of this.search) {
            let found = false;

            for (let properties of [
                "name",
                "street",
                "street2",
                "zip",
                "city",
                "tags",
                "opening_hours",
            ]) {
                if (normalize(feature.get(properties)).includes(word)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }

    /**
     * Style function for the stores
     * @param {ol.Feature} feature
     * @returns {ol.style.Style}
     */
    styleFunction(feature) {
        let foundStyle;
        let notFoundStyle;
        if (!foundStyle) {
            foundStyle = new ol.style.Style({
                image: buildIcon(
                    20,
                    10,
                    "rgba(0, 0, 255, 0.2)",
                    1.5,
                    "rgb(0, 0, 255)",
                    5,
                    "rgba(0, 0, 0, 0)",
                    1.5,
                    "rgb(0, 0, 255)"
                ),
            });
        }
        if (!notFoundStyle) {
            notFoundStyle = new ol.style.Style({
                image: new StyleCircleNoHit({
                    radius: 3,
                    fill: new ol.style.Fill({color: [100, 100, 100, 0.5]}),
                }),
            });
        }
        if (this.searchFeature(feature)) {
            return foundStyle;
        }
        return notFoundStyle;
    }
}

export default Search;
