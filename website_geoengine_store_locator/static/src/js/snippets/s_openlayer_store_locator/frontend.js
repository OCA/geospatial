/** @odoo-module **/

import publicWidget from "web.public.widget";
import OpenLayerMap from "./map";
import rpc from "web.rpc";
import { useService } from '@web/core/utils/hooks';
const { useState } = owl;

publicWidget.registry.OpenLayerStoreLocator = publicWidget.Widget.extend({
    selector: ".s_openlayer_store_locator",
    cssLibs: [
        "/website_geoengine_store_locator/static/styles.css",
        "/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css",
    ],

    /**
     * @override
     */
    start() {
        const lang = (document.documentElement.getAttribute('lang') || 'en_US').replace('-', '_');
        rpc.query({
            model: "res.partner",
            method: "get_search_tags",
            args: ['es', lang]
        }).then(function (result) {
            console.log(result);
        }, function (error) {
            console.log(error);
        });


        rpc.query({
            model: "res.partner",
            method: "fetch_partner_geoengine",
            args: [{
                'tag': 'Test',
                'name': 'Onestein'
            }, lang]
        }).then(function (result) {
            console.log(result);
        }, function (error) {
            console.log(error);
        });        

        if (!this.el.querySelector(".ol-viewport")) {
            const dataset = this.el.dataset;
            console.log(dataset);
            this.element = this.el;
            this.map = new OpenLayerMap(this.element, dataset.mapType);
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenLayerStoreLocator;
