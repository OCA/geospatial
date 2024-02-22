/** @odoo-module **/

import core from 'web.core';


//import publicWidget from "web.public.widget";
import dynamicSnippetOptions from 'website.s_dynamic_snippet_options';

import OLM from 'website_geoengine_store_locator.openlayer_map';

const _t = core._t;

const OpenLayerMap = dynamicSnippetOptions.extend({


    onBuilt: function () {
        console.log(OLM)
        console.log("onBuilt")
        this._super.apply(this, arguments);
    },

    saveSnippet: function (previewMode, widgetValue, params) {
        console.log("save")
        return this._super(...arguments);
    },

    selectDataAttribute: async function (previewMode, widgetValue, params) {
        //await this._super(...arguments);
        console.log("Options modified: "+params.attributeName)
        console.log(params)
        if (['mapAddress', 'mapType', 'mapZoom'].includes(params.attributeName)) {
            console.log("Change in map options")
        }
    },

    cleanForSave: function () {
        this._super.apply(this, arguments);
        this.$target.empty();
    },

});

export default {
    OpenStreetMap: OpenLayerMap
};
