/** @odoo-module */

class Popover {

    _map = undefined
    popover = undefined
    _popup = undefined

    constructor(elt, map) {
        console.log("constructor popover")
        this._map = map
        this.el = elt
        this._popup = document.getElementById("popup");
        this.popup = new ol.Overlay({
            element: this._popup,
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
            this.popover.toggle();
            this.popover = undefined;
        }
    }

    /**
     * The function called on map click event
     * @param {ol.MapBrowserEvent} evt
     */
    mapOnClick(evt) {
        
        const feature = this._map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            return feature;
        });
        console.log(feature)
        this.disposePopover();
        if (!feature) {
            return;
        }
        this.popup.setPosition(evt.coordinate);
        //this.popup.setElement(feature)

        
        this.popover = $(this._popup).popover( {
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
        const pixel = this._map.getEventPixel(e.originalEvent);
        const hit = this._map.hasFeatureAtPixel(pixel);
        this._map.getTarget().style.cursor = hit ? "pointer" : "";
    }
}

export default Popover;
