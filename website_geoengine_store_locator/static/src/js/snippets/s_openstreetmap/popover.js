/** @odoo-module */

class Popover {
    /**
     * The base element
     * @param {HTMLElement} element
     */
    element = undefined;
    /**
     * The jQuery base element
     */
    jqueryElement = undefined;
    /**
     * The map
     * @param {ol.Map} map
     */
    map = undefined;
    /**
     * The popup overlay
     * @param {ol.Overlay} popup
     */
    popup = undefined;
    /**
     * The popover
     * @param {jQuery} popover
     */
    popover = undefined;

    constructor(element, map) {
        this.map = map;
        this.element = element;
        this.jqueryElement = $(element);
        this.popup = new ol.Overlay({
            element: this.element,
            positioning: "bottom-center",
            stopEvent: false,
        });
        map.addOverlay(this.popup);
        map.on("click", this.mapOnClick.bind(this));
        map.on("pointermove", this.mapOnPointerMove.bind(this));
        map.getView().on("change:center", this.mapOnMove.bind(this));
    }

    /**
     * Dispose the popover
     */
    disposePopover() {
        console.log("disposePopover");
        if (this.popover) {
            this.popover.popover("dispose");
            this.popover = undefined;
        }
    }

    mapOnMove(event) {
        if (!this.feature) {
            return;
        }
        //this.popup.setPosition(this.feature.getGeometry().getFirstCoordinate());
        $(this.element).popover("show");
    }

    /**
     * The function called on map click event
     * @param {ol.MapBrowserEvent} event
     */
    mapOnClick(event) {
        this.feature = this.map.forEachFeatureAtPixel(event.pixel, function (feature) {
            return feature;
        });

        this.disposePopover();
        if (!this.feature) {
            return;
        }

        this.popup.setPosition(this.feature.getGeometry().getFirstCoordinate());
        if (!this.popover) {
            this.popover = $(this.element).popover({
                placement: "top",
                html: true,
                trigger: "focus",
                content: `
          ${this.feature.get("store_category")}<br/>
          <b>${this.feature.get("name")}</b><br/>
          ${this.feature.get("address")}<br/>
          ${this.feature.get("contact")}<br/>
          ${this.feature.get("opening_hours")}`,
            });
        }
        this.popover.popover("show");
    }

    /**
     * The function called on map pointer move event
     * @param {ol.MapBrowserEvent} e
     */
    mapOnPointerMove(e) {
        const pixel = this.map.getEventPixel(e.originalEvent);
        const hit = this.map.hasFeatureAtPixel(pixel);
        this.map.getTarget().style.cursor = hit ? "pointer" : "";
    }
}

export default Popover;
