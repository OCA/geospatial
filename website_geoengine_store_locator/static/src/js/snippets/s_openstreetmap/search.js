/** @odoo-module **/

    /**
     * Create a standard symbol for a POI
     * @param {number} radius the radius of the top circle
     * @param {number} height the height of the circle center
     * @param {string} fillColor the fill color of the symbol
     * @param {number} strokeWidth the stroke width of the symbol
     * @param {string} strokeColor the stroke color of the symbol
     * @param {number} centerRadius the radius of the center point
     * @param {string} centerColor the fill color of the center point
     * @returns
     */
    function buildIcon(
        radius,
        height,
        fillColor,
        strokeWidth,
        strokeColor,
        centerRadius,
        centerColor
    ) {
        const canvas = document.createElement("canvas");
        canvas.width = radius * 2 + strokeWidth;
        canvas.height = radius + height + strokeWidth;
        const context = canvas.getContext("2d");

        const circleCenter = [canvas.width / 2, radius + strokeWidth / 2];
        const linesStart = [canvas.width / 2, radius + height + strokeWidth / 2];
        const alpha = Math.acos(radius / height);
        const linesWeight = Math.sin(alpha) * radius;
        const linesHeight = height - Math.cos(alpha) * radius;
        const line1End = [canvas.width / 2 - linesWeight, linesStart[1] - linesHeight];
        const line2End = [canvas.width / 2 + linesWeight, linesStart[1] - linesHeight];

        context.fillStyle = fillColor;
        context.strokeStyle = strokeColor;
        context.lineWidth = strokeWidth;
        context.lineJoin = "round";

        context.beginPath();
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
        context.stroke();
        context.fill();
        context.closePath();

        context.fillStyle = centerColor;
        context.beginPath();
        context.arc(circleCenter[0], circleCenter[1], centerRadius, 0, Math.PI * 2);
        context.fill();
        context.closePath();

        return new ol.style.Icon({
            img: canvas,
            anchor: [0.5, 1],
        });
    }

    /**
     * Normalize a string by removing accents and lowercasing it for the search.
     * @param {string} string
     * @returns
     */
    function normalize(string) {
        return (
            string
                .toLowerCase()
                // remove accents
                .normalize("NFKD")
                .replace(/\p{Diacritic}/gu, "")
        );
    }

    class Search {
        _element = undefined;
        constructor(element, stores) {
            this._element = element;
            this.stores = stores;
            element.addEventListener("keyup", this.onKeyUp.bind(this));
            this.update();
        }

        /**
         * The function called on input key up event
         * @param {KeyboardEvent} e
         */
        onKeyUp(e) {
                this.update();
        }

        update(t) {
            this.search = normalize(this._element.value).split(" ");
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
            for (let properties of ["name", "contact"]) {
                if (normalize(feature.get(properties)).includes(word)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log("not found", feature.get("name"));
                return false;
            }
        }
        console.log("found", feature.get("name"));
        return true;
    }


    /**
     * Style function for the stores
     * @param {ol.Feature} feature
     * @returns {ol.style.Style}
     */
    styleFunction(feature) {
        let foundStyle;
        let notFoundStyle
        if (!foundStyle) {
            foundStyle = new ol.style.Style({
                image: buildIcon(
                    10,
                    25,
                    "rgba(0, 0, 255, 0.2)",
                    1.5,
                    "rgb(0, 0, 255)",
                    2.5,
                    "rgb(50, 50, 255)"
                ),
            });
        }
        if (!notFoundStyle) {
            notFoundStyle = new ol.style.Style({
                image: new ol.style.Circle({
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
