/** @odoo-module */

class Popover {

    map = undefined
    element = undefined
    popup = undefined

    constructor(element, map) {
        this.map = map
        this.element = element;
        this.popup = new ol.Overlay({
            element: this.element,
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
        if (this.element) {
            this.element.dispose();
            this.element = undefined;
        }
    }

    /**
     * The function called on map click event
     * @param {ol.MapBrowserEvent} evt
     */
    mapOnClick(evt) {

        const feature = this.map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            return feature;
        });
        console.log(feature)
        this.disposePopover();
        if (!feature) {
            return;
        }
        this.popup.setPosition(evt.coordinate);
        //this.popup.setElement(feature)


        this.popover = this.element.popover( {
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
        const pixel = this.map.getEventPixel(e.originalEvent);
        const hit = this.map.hasFeatureAtPixel(pixel);
        this.map.getTarget().style.cursor = hit ? "pointer" : "";
    }
}

export default Popover;
