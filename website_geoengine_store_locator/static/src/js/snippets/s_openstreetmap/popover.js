/** @odoo-module */

class Popover {
    constructor(element, map) {
        const element = document.getElementById("popup");
        this.popup = new ol.Overlay({
            element: element,
            positioning: "bottom-center",
            stopEvent: false,
        });
        map.addOverlay(this.popup);
        map.on("click", this.mapOnClick.bind(this));
        map.on("pointermove", this.mapOnPointerMove.bind(this));
        map.on("movestart", this.disposePopover.bind(this));
    }

    /**
     * Dispose the popover
     */
    disposePopover() {
        if (this.popover) {
            this.popover.dispose();
            this.popover = undefined;
        }
    }

    /**
     * The function called on map click event
     * @param {ol.MapBrowserEvent} evt
     */
    mapOnClick(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            return feature;
        });
        disposePopover();
        if (!feature) {
            return;
        }
        popup.setPosition(evt.coordinate);
        this.popover = new bootstrap.Popover(element, {
            placement: "top",
            html: true,
            content: `
          ${feature.get("store_category")}<br/>
          <b>${feature.get("name")}</b><br/>
          ${feature.get("address")}<br/>
          ${feature.get("contact")}<br/>
          ${feature.get("opening_hours")}`,
        });
        this.popover.show();
    }

    /**
     * The function called on map pointer move event
     * @param {ol.MapBrowserEvent} e
     */
    mapOnPointerMove(e) {
        const pixel = map.getEventPixel(e.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel);
        map.getTarget().style.cursor = hit ? "pointer" : "";
    }
}

export default Popover;
