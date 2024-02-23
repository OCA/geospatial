/** @odoo-module **/
//import {openLayerMap} from './map';

import core from 'web.core';
import options from 'web_editor.snippets.options';
//




const _t = core._t;

options.registry.OpenLayerStoreLocator = options.Class.extend({

    //test: console.log(openLayerMap),
    init() {
        console.log("init") 
        return this._super.apply(this, arguments);
    },

    async onBuilt() {
        
        console.log("onBuilt")
        this._super.apply(this, arguments);
    },
    
    saveSnippet(previewMode, widgetValue, params) {
        console.log("save")
        return this._super(...arguments);
    },
    

    async selectDataAttribute (previewMode, widgetValue, params) {
        //await this._super(...arguments);
        console.log("Options modified: "+params.attributeName)
        console.log(params)
        if (['mapAddress', 'mapType', 'mapZoom'].includes(params.attributeName)) {
            console.log("Change in map options")
        }
    },
    

    cleanForSave() {
        console.log("cleanForSave")
        this._super.apply(this, arguments);
        //console.log( this.$target)
        //console.log(this.$target[0].querySelector(".map_container"))
        
        //console.log("cleanForSaveEnd")
        //this.$target.querySelector(".map_container")//.empty();
    },
    pouf5: console.log("5"),

});
console.log( options.registry)
export default {
    OpenLayerStoreLocator: options.registry.OpenLayerStoreLocator
};
console.log( options.registry)
