/** @odoo-module **/

import publicWidget from 'web.public.widget';
import {generateOSMapLink, generateOSMapIframe} from 'openstreetmap.utils';

publicWidget.registry.OpenStreetMap = publicWidget.Widget.extend({
    selector: '.s_openstreetmap',
    jsLibs: [
        'https://cdn.jsdelivr.net/npm/ol@v8.2.0/dist/ol.js',
    ],
    cssLibs: [
        'https://cdn.jsdelivr.net/npm/ol@v8.2.0/ol.css',
    ],
    /**
     * @override
     */
    start() {
        if (!this.el.querySelector('.s_openstreetmap_embedded')) {

            const dataset = this.el.dataset;
            
            const map = new ol.Map({
                target: this.el.getElementsByTagName('div')[0],
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.OSM(),
                    }),
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([6, 46]),
                    zoom: 6,
                }),
            });
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenStreetMap;
