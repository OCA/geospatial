/** @odoo-module **/

import publicWidget from 'web.public.widget';
import {generateOSMapLink, generateOSMapIframe} from 'openstreetmap.utils';

publicWidget.registry.OpenStreetMap = publicWidget.Widget.extend({
    selector: '.s_openstreetmap',

    /**
     * @override
     */
    start() {
        if (!this.el.querySelector('.s_openstreetmap_embedded')) {
            // The iframe is not found inside the snippet. This is probably due
            // the sanitization of a field during the save, like in a product
            // description field.
            // In such cases, reconstruct the iframe.
            const dataset = this.el.dataset;
            console.log("Parci")
            if (dataset.mapAddress || true) {
                const iframeEl = generateOSMapIframe();
                iframeEl.setAttribute('src', generateOSMapLink(dataset));
                this.el.querySelector('.s_openstreetmap_color_filter').before(iframeEl);
            }
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenStreetMap;
